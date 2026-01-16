// This file contains the API route for recommending content.

async function recommendContent(req, res) {
    try {
        const content = await fetchContent(req.body);
        return res.status(200).json(content);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred while fetching content.' });
    }
}