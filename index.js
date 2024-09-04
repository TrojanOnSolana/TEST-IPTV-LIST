import axios from 'axios';
import fs from 'fs';
import pLimit from 'p-limit';

// URL of the playlist
const playlistUrl = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';

// Limit the number of parallel requests (adjust this number based on your system capacity)
const limit = pLimit(10);  // 10 parallel requests

// Function to test a single m3u8 URL
async function testM3U8Url(url) {
    try {
        const response = await axios.get(url, { timeout: 5000 });  // 5-second timeout
        if (response.status === 200) {
            console.log(`✅ Working: ${url}`);
            return { url, status: true };
        } else {
            console.log(`❌ Not Working: ${url}`);
            return { url, status: false };
        }
    } catch (error) {
        console.log(`❌ Not Working: ${url}`);
        return { url, status: false };
    }
}

// Function to download and parse the m3u8 playlist
async function downloadAndTestPlaylist() {
    try {
        const response = await axios.get(playlistUrl);
        const playlistContent = response.data;

        // Split the content by new lines to process each URL
        const lines = playlistContent.split('\n');
        const testPromises = [];

        // Create or empty the working.m3u8 file before starting
        fs.writeFileSync('working.m3u8', '', 'utf-8');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // If the line is a URL, test it
            if (line && line.startsWith('http')) {
                // Use p-limit to ensure limited concurrency
                testPromises.push(
                    limit(async () => {
                        const result = await testM3U8Url(line);
                        if (result.status) {
                            // Write the working URL to the file in real-time
                            fs.appendFileSync('working.m3u8', result.url + '\n', 'utf-8');
                            console.log(`Appended to file: ${result.url}`);
                        }
                    })
                );
            } else {
                // Write non-URL lines (like comments or metadata) to the file directly
                fs.appendFileSync('working.m3u8', line + '\n', 'utf-8');
            }
        }

        // Wait for all tests to complete
        await Promise.all(testPromises);

        console.log('✅ Finished processing the playlist and saving working URLs.');
    } catch (error) {
        console.error('Error downloading or testing playlist:', error);
    }
}

// Start the process
downloadAndTestPlaylist();
