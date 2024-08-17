const clientPromise = require('./mongodb.js');
const puppeteer = require('puppeteer');

// Function to connect to MongoDB and store scrapped data in it
async function storeInDB(scrapedData) {
    const client = await clientPromise;

    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const db = client.db("scrappedInfo");
        const collection = db.collection("webInfo");

        const res = await collection.insertOne(scrapedData);
        console.log(`New document inserted with _id: ${res.insertedId}`);
    } catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
    } finally {
        await client.close();
    }
}

// Function to scrape the web page
async function scrapeWebPage(url) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Extend navigation timeout
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extract title
        const title = await page.$eval('h1', el => el.textContent.trim()).catch(() => 'Title not found');
        console.log('Title:', title);

        // Extract image URL
        const image = await page.$eval('img', img => img.getAttribute('data-src') || img.src).catch(() => 'Image URL not found');
        console.log('Image URL:', image);

        // Extract headings
        const headings = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => heading.textContent.trim());
        }).catch(() => 'Headings not found');
        console.log('Headings:', headings);

        // Extract paragraphs
        const paragraphs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim());
        }).catch(() => 'Paragraphs not found');
        console.log('Paragraphs:', paragraphs);

        // Extract links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href);
        }).catch(() => 'Links not found');
        console.log('Links:', links);

        // Create a data object to store in MongoDB
        const scrapedData = {
            url,
            title,
            image,
            headings,
            paragraphs,
            links,
            date: new Date(),
        };

        // Save the data to the database
        await storeInDB(scrapedData);

        await browser.close();
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error("Page not found (404):", url);
        } else {
            console.error('Error fetching the webpage:', error.message);
        }
    }
}

// Example usage: Pass the URL as a command-line argument
const url = process.argv[2];
if (url) {
    scrapeWebPage(url);
} else {
    console.log('Please provide a URL as an argument.');
}
