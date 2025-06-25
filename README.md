**Data Compression & Decompression Portal**

 ***PROJECT DESCRIPTION**:
 
Welcome to my Data Compression & Decompression Portal project! This is a super cool web application I built that lets you compress and decompress files using two powerful algorithms: **DEFLATE** (the one everyone uses!) and **LZ77**.
this project dives deep into how data compression actually works under the hood.

![image](https://github.com/user-attachments/assets/47da713f-8045-4dac-8bb7-54542a9695ba)

***FEATURES**

  * Drag & Drop Simplicity: Just drag your file onto the page, or click to browse. It's super intuitive\!
  *
      **DEFLATE:** This is the industry standard, used in things like ZIP files and PNG images.
      
      **LZ77:** A foundational algorithm that's great at finding and replacing repeated patterns.
  * Easily compress files to save space or decompress them back to their original form.
  * **Detailed Statistics:** After processing, you'll see stats like:
    
    Original vs. Processed File Size
    
    Compression Ratio
    
    Space Savings
    
    Processing Time
    
  * **User-Friendly Interface:** I focused on making the design clean, responsive, and easy to navigate, even on mobile!
  


 ***Tech Stack & Implementation Details**

This project leverages a modern web stack to deliver a robust and interactive experience.

### Frontend (`frontend.html` & CSS)

  * **HTML5:** Structures the entire web page, providing the foundation for the portal's content.
  * **CSS3:** Styles the application, creating a visually appealing and responsive design. I've used **Flexbox/Grid** for layout to ensure it looks great on various screen sizes.

### Backend (`backend.js`)

The core logic and functionality are handled by JavaScript.

  * **Vanilla JavaScript:** All interactivity, file handling, and algorithm implementations are written in pure JavaScript, avoiding external frameworks for a lightweight solution.
  * **Web APIs:**
      * **File API:** Used for handling file uploads (via input and drag-and-drop), reading file contents as ArrayBuffers, and creating Blobs for downloadable processed files.
      * **Compression Streams API (CompressionStream, DecompressionStream):** This powerful, native browser API is utilized for the **DEFLATE** algorithm, providing high-performance and reliable compression/decompression that's consistent with req standards (like GZIP, ZIP).
      * **TextEncoder & TextDecoder:** Essential for converting strings to Uint8Arrays and vice-versa, particularly for handling filenames and magic bytes within the custom file format.
      * **performance.now():** Used for accurate benchmarking of compression and decompression operations to display processing times to the user.
  * **Custom LZ77 Implementation:** I wrote the **LZ77 compression and decompression logic from scratch**. This involves:
      * **Sliding Window Algorithm:** Implementing the core LZ77 mechanism to find repeating byte sequences within a defined window and replace them with (distance, length) pairs.
      * **Byte-level Manipulation:** Directly working with Uint8Arrays for efficient binary data processing.
  * **Custom File Format:** To manage compressed files, a simple custom format is used, prepending a "magic" identifier (DFL8 for DEFLATE, LZ77 for LZ77) and the original filename (along with its length) to the compressed data. This allows the decompressor to correctly identify the algorithm used and reconstruct the original file name.

***How to Run It Locally**

To run this web application properly and ensure all browser features work, you'll need a local web server. 

### Method 1: Using Python's Built-in HTTP Server (I would recomend you to do this)

If you have Python installed:

1.  **Clone the repository:**
    Open your terminal or command prompt and run:
    ```bash
    git clone https://github.com/sushma9112006/compression.git
    ```
2.  **Navigate to the project directory:**
    The *frontend.html* and *backend.js* files, which form the web interface, are located within the code sub-folder of the compression repository. You need to navigate to this specific directory.

    ```bash
    cd compression/code
    ```

    * **Note for Windows users:** You might see *cd compression\code* in your command prompt, which is also correct.

3.  **Start the HTTP server:**
    **Keep this command prompt/terminal window open** as long as you want the server to run 

    ```bash
    python -m http.server
    ```
    * You should see a message similar to: `Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...`

4.  **Open in your web browser:**
    Once the server is running (as indicated by the message in your terminal/command prompt), open your preferred web browser.

    In the browser's address bar, type the following URL and press Enter:

    ```
    http://localhost:8000
    ```

    You should now see the web interface of the compression project loaded in your browser

### Troubleshooting

* **`'git' is not recognized...` or `'python' is not recognized...`**:
   Git/Python is not installed or not correctly added to your system's PATH. Ensure they are installed correctly.
* **`The system cannot find the path specified.` (when using `cd code`)**:
    You are likely not in the correct parent directory. Remember to first `cd compression` after cloning, and *then* `cd code`. The full path should be `compression/code`.
* **`Address already in use`**:
    if already using port 8000, try a different port by running the server command with a port number, e.g.:
    ```bash
    python -m http.server 8080
    ```
    Then, access it in your browser at `http://localhost:8080`.
* **Blank page or errors in browser**:
 check for JavaScript or network errors. Ensure the server is still running in your command prompt.



## Deployed Demo

Live demo of the Compression Portal :

**DEPLOYED DEMO LINK**

https://compression-portal.netlify.app/frontend.html

***IMPORTANT***::You'll see frontend.html there because that's the main page for my project, not the usual index.html.... So, if you just go to the base URL, it might not load the right way


## DEMO VIDEO LINK

https://drive.google.com/file/d/17U42g-hNTp3Sq2d5MpOeIrOrVIzffUo_/view?usp=drivesdk
