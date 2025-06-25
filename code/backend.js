function stringToUint8Array(str) {
    return new TextEncoder().encode(str);
}

function uint8ArrayToString(arr) {
    return new TextDecoder().decode(arr);
}

const MAGIC_DEFLATE = "DFL8";
const MAGIC_LZ77 = "LZ77";

async function compressDeflate(filename, fileData) {
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(fileData);
            controller.close();
        }
    });
    const compressedStream = readable.pipeThrough(new CompressionStream('deflate'));
    const compressedResponse = new Response(compressedStream);
    const compressedBlob = await compressedResponse.blob();
    const compressedArrayBuffer = await compressedBlob.arrayBuffer();
    const compressedData = new Uint8Array(compressedArrayBuffer);
    const filenameBytes = stringToUint8Array(filename);
    const bufferLength = 4 + 2 + filenameBytes.length + compressedData.length;
    const output = new Uint8Array(bufferLength);
    let offset = 0;
    output.set(stringToUint8Array(MAGIC_DEFLATE), offset);
    offset += 4;
    output[offset++] = (filenameBytes.length >> 8) & 0xff;
    output[offset++] = filenameBytes.length & 0xff;
    output.set(filenameBytes, offset);
    offset += filenameBytes.length;
    output.set(compressedData, offset);
    return output;
}

async function decompressDeflate(compressedFileData) {
    let offset = 0;
    const magicBytes = uint8ArrayToString(compressedFileData.slice(0, 4));
    if (magicBytes !== MAGIC_DEFLATE) {
        throw new Error("Not a DEFLATE compressed file or corrupted.");
    }
    offset += 4;
    const filenameLength = (compressedFileData[offset++] << 8) | compressedFileData[offset++];
    const filenameBytes = compressedFileData.slice(offset, offset + filenameLength);
    const filename = uint8ArrayToString(filenameBytes);
    offset += filenameLength;
    const compressedData = compressedFileData.slice(offset);
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(compressedData);
            controller.close();
        }
    });
    const decompressedStream = readable.pipeThrough(new DecompressionStream('deflate'));
    const decompressedResponse = new Response(decompressedStream);
    const decompressedBlob = await decompressedResponse.blob();
    const decompressedArrayBuffer = await decompressedBlob.arrayBuffer();
    const originalData = new Uint8Array(decompressedArrayBuffer);
    return {
        filename,
        originalData
    };
}

function compressLZ77(data) {
    const windowSize = 2048;
    const lookaheadBuffer = 258;
    let position = 0;
    const output = [];
    while (position < data.length) {
        let bestMatch = {
            distance: 0,
            length: 0
        };
        const start = Math.max(0, position - windowSize);
        for (let i = start; i < position; i++) {
            let j = 0;
            while (j < lookaheadBuffer &&
                position + j < data.length &&
                data[i + j] === data[position + j]) {
                j++;
            }
            if (j > bestMatch.length) {
                bestMatch = {
                    distance: position - i,
                    length: j
                };
            }
        }
        if (bestMatch.length > 2) {
            output.push(0);
            output.push((bestMatch.distance >> 8) & 0xff);
            output.push(bestMatch.distance & 0xff);
            output.push(bestMatch.length - 3);
            position += bestMatch.length;
        } else {
            output.push(1);
            output.push(data[position]);
            position++;
        }
    }
    return new Uint8Array(output);
}

function decompressLZ77(compressedData) {
    const output = [];
    let position = 0;
    while (position < compressedData.length) {
        const flag = compressedData[position++];
        if (flag === 0) {
            const distance = (compressedData[position++] << 8) | compressedData[position++];
            const length = compressedData[position++] + 3;
            if (distance > output.length || distance <= 0) {
                throw new Error(`Invalid distance value: ${distance}`);
            }
            const start = output.length - distance;
            for (let i = 0; i < length; i++) {
                output.push(output[start + (i % distance)]);
            }
        } else if (flag === 1) {
            output.push(compressedData[position++]);
        } else {
            throw new Error(`Invalid flag byte: ${flag}`);
        }
    }
    return new Uint8Array(output);
}

function compressFileLZ77(filename, fileData) {
    const compressedData = compressLZ77(fileData);
    const filenameBytes = stringToUint8Array(filename);
    const bufferLength = 4 + 2 + filenameBytes.length + 4 + compressedData.length;
    const output = new Uint8Array(bufferLength);
    let offset = 0;
    output.set(stringToUint8Array(MAGIC_LZ77), offset);
    offset += 4;
    output[offset++] = (filenameBytes.length >> 8) & 0xff;
    output[offset++] = filenameBytes.length & 0xff;
    output.set(filenameBytes, offset);
    offset += filenameBytes.length;
    output[offset++] = (compressedData.length >> 24) & 0xff;
    output[offset++] = (compressedData.length >> 16) & 0xff;
    output[offset++] = (compressedData.length >> 8) & 0xff;
    output[offset++] = compressedData.length & 0xff;
    output.set(compressedData, offset);
    return output;
}

function decompressFileLZ77(compressedFileData) {
    let offset = 0;
    const magicBytes = uint8ArrayToString(compressedFileData.slice(0, 4));
    if (magicBytes !== MAGIC_LZ77) {
        throw new Error("Not an LZ77 compressed file or corrupted.");
    }
    offset += 4;
    const filenameLength = (compressedFileData[offset++] << 8) | compressedFileData[offset++];
    const filenameBytes = compressedFileData.slice(offset, offset + filenameLength);
    const filename = uint8ArrayToString(filenameBytes);
    offset += filenameLength;
    const compressedDataLength =
        (compressedFileData[offset++] << 24) |
        (compressedFileData[offset++] << 16) |
        (compressedFileData[offset++] << 8) |
        compressedFileData[offset++];
    const compressedData = compressedFileData.slice(offset, offset + compressedDataLength);
    const originalData = decompressLZ77(compressedData);
    return {
        filename,
        originalData
    };
}

const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const compressDeflateBtn = document.getElementById("compressDeflateBtn");
const compressLZ77Btn = document.getElementById("compressLZ77Btn");
const decompressBtn = document.getElementById("decompressBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetProcessedBtn = document.getElementById("resetProcessedBtn");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const statsContent = document.getElementById("statsContent");
const dropContainer = document.getElementById("dropContainer");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileType = document.getElementById("fileType");
const removeFile = document.getElementById("removeFile");
const downloadSection = document.getElementById("downloadSection");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const timeContainer = document.getElementById("timeContainer");
const timeValue = document.getElementById("timeValue");

let selectedFile = null;
let processedBlob = null;
let processedFilename = null;
let originalSize = 0;
let processedSize = 0;
let method = "";
let action = "";
let processingTime = 0;

browseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", handleFileSelect);
removeFile.addEventListener("click", resetFile);
downloadBtn.addEventListener("click", downloadProcessedFile);
resetProcessedBtn.addEventListener("click", resetProcessedState);

disableButtons();
clearStatus();

function handleFileSelect() {
    selectedFile = fileInput.files[0] || null;
    if (selectedFile) {
        if (selectedFile.size > 100 * 1024 * 1024) {
            showError("File size exceeds 100MB limit");
            return;
        }
        updateFileInfo();
        clearStatus();
        enableButtons();
        resetProcessedState();
    }
}

function updateFileInfo() {
    fileName.textContent = selectedFile.name;
    fileSize.textContent = formatFileSize(selectedFile.size);

    const type = selectedFile.type || selectedFile.name.split('.').pop().toUpperCase();
    fileType.textContent = type === '' ? 'Unknown' : type;

    fileInfo.classList.remove("d-none");
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatTime(ms) {
    if (ms < 1000) return ms.toFixed(2) + 'ms';
    else return (ms / 1000).toFixed(2) + 's';
}

function enableButtons() {
    compressDeflateBtn.disabled = false;
    compressLZ77Btn.disabled = false;
    decompressBtn.disabled = false;
}

function disableButtons() {
    compressDeflateBtn.disabled = true;
    compressLZ77Btn.disabled = true;
    decompressBtn.disabled = true;
}

function clearStatus() {
    statusEl.textContent = "";
    statusEl.className = "status";
    statsEl.style.display = "none";
    progressContainer.style.display = "none";
    progressBar.style.width = "0%";
    timeContainer.classList.add("d-none");
}

function showError(msg) {
    statusEl.textContent = msg;
    statusEl.className = "status error";
    progressContainer.style.display = "none";
    timeContainer.classList.add("d-none");
}

function showSuccess(msg) {
    statusEl.textContent = msg;
    statusEl.className = "status success";
}

function showStats() {
    const ratio = (processedSize / originalSize) * 100;
    const savings = 100 - ratio;
    statsContent.textContent = `Method: ${method}
Action: ${action}
Original Size: ${formatFileSize(originalSize)}
Processed Size: ${formatFileSize(processedSize)}
Compression Ratio: ${ratio.toFixed(2)}%
Space Savings: ${savings.toFixed(2)}%
Processing Time: ${formatTime(processingTime)}`;
    statsEl.style.display = "block";
}

function updateTimeDisplay() {
    timeValue.textContent = `Processing time: ${formatTime(processingTime)}`;
    timeContainer.classList.remove("d-none");
}

function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.add("d-none");
    disableButtons();
    clearStatus();
    resetProcessedState();
}

function resetProcessedState() {
    processedBlob = null;
    processedFilename = null;
    downloadSection.classList.add("d-none");
    timeContainer.classList.add("d-none");
}

function updateProgress(percent) {
    progressBar.style.width = percent + "%";
}

compressDeflateBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    if (selectedFile.size > 25 * 1024 * 1024) { // 25 MB
        alert("This may take a little longer to process.");
    }

    disableButtons();
    clearStatus();
    showSuccess("Compressing with DEFLATE...");
    progressContainer.style.display = "block";
    timeContainer.classList.add("d-none");
    updateProgress(30);

    const startTime = performance.now();

    try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        originalSize = fileData.length;

        updateProgress(60);
        const compressed = await compressDeflate(selectedFile.name, fileData);

        updateProgress(90);
        processedSize = compressed.length;
        method = "DEFLATE";
        action = "Compression";
        processedFilename = selectedFile.name + ".dfc";
        processedBlob = new Blob([compressed], {
            type: "application/octet-stream"
        });

        updateProgress(100);
        processingTime = performance.now() - startTime;
        updateTimeDisplay();
        showStats();
        showSuccess("Compression complete! Ready for download.");
        downloadSection.classList.remove("d-none");
    } catch (e) {
        showError("Compression failed: " + e.message);
        enableButtons();
    }
});

compressLZ77Btn.addEventListener("click", async () => {
    if (!selectedFile) return;

    if (selectedFile.size > 25 * 1024 * 1024) { // 25 MB
        alert("This may take a little longer to process.");
    }
    alert("I would suggest you to use GZip");

    disableButtons();
    clearStatus();
    showSuccess("Compressing with LZ77...");
    progressContainer.style.display = "block";
    timeContainer.classList.add("d-none");
    updateProgress(30);

    const startTime = performance.now();

    try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        originalSize = fileData.length;

        updateProgress(60);
        const compressed = compressFileLZ77(selectedFile.name, fileData);

        updateProgress(90);
        processedSize = compressed.length;
        method = "LZ77";
        action = "Compression";
        processedFilename = selectedFile.name + ".lz7";
        processedBlob = new Blob([compressed], {
            type: "application/octet-stream"
        });

        updateProgress(100);
        processingTime = performance.now() - startTime;
        updateTimeDisplay();
        showStats();
        showSuccess("Compression complete! Ready for download.");
        downloadSection.classList.remove("d-none");
    } catch (e) {
        showError("Compression failed: " + e.message);
        enableButtons();
    }
});

decompressBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    disableButtons();
    clearStatus();
    showSuccess("Decompressing...");
    progressContainer.style.display = "block";
    timeContainer.classList.add("d-none");
    updateProgress(30);

    const startTime = performance.now();

    try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const compressedData = new Uint8Array(arrayBuffer);
        originalSize = compressedData.length;

        updateProgress(60);

        if (compressedData.length < 4) {
            throw new Error("Invalid compressed file format");
        }

        const magic = uint8ArrayToString(compressedData.slice(0, 4));
        let decompressed;

        if (magic === MAGIC_DEFLATE) {
            decompressed = await decompressDeflate(compressedData);
            method = "DEFLATE";
        } else if (magic === MAGIC_LZ77) {
            decompressed = decompressFileLZ77(compressedData);
            method = "LZ77";
        } else {
            throw new Error("File was not compressed by this tool or is corrupted.");
        }

        updateProgress(80);
        if (!decompressed.originalData || decompressed.originalData.length === 0) {
            throw new Error("Decompression resulted in empty file");
        }

        processedSize = decompressed.originalData.length;
        action = "Decompression";

        const origName = decompressed.filename;
        const dotIndex = origName.lastIndexOf(".");
        if (dotIndex === -1) {
            processedFilename = origName + "-decompressed";
        } else {
            processedFilename = origName.slice(0, dotIndex) + "-decompressed" + origName.slice(dotIndex);
        }

        processedBlob = new Blob([decompressed.originalData], {
            type: "application/octet-stream"
        });

        updateProgress(100);
        processingTime = performance.now() - startTime;
        updateTimeDisplay();
        showStats();
        showSuccess("Decompression complete! Ready for download.");
        downloadSection.classList.remove("d-none");
    } catch (e) {
        showError("Decompression failed: " + e.message);
        enableButtons();
    }
});

function downloadProcessedFile() {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = processedFilename;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Download started!");
}

dropContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropContainer.style.backgroundColor = "rgba(205, 180, 219, 0.2)";
});

dropContainer.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropContainer.style.backgroundColor = "";
});

dropContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    dropContainer.style.backgroundColor = "";
    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (file.size > 100 * 1024 * 1024) {
            showError("File size exceeds 100MB limit");
            return;
        }
        fileInput.files = e.dataTransfer.files;
        selectedFile = fileInput.files[0];
        updateFileInfo();
        clearStatus();
        enableButtons();
        resetProcessedState();
    }
});