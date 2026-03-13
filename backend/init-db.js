const { MongoClient } = require('mongodb');

async function initDb() {
    const uri = 'mongodb://localhost:27017/hopeinternational';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hopeinternational');

        const collections = [
            'User', 'Admission', 'Holiday', 'Contact', 'Gallery',
            'Notification', 'Page', 'Announcement', 'Attendance',
            'Result', 'Homework', 'Complaint', 'Fee'
        ];

        for (const coll of collections) {
            try {
                await db.createCollection(coll);
                console.log(`Created collection: ${coll}`);
            } catch (err) {
                if (err.code === 48) {
                    console.log(`Collection already exists: ${coll}`);
                } else {
                    console.error(`Error creating ${coll}:`, err.message);
                }
            }
        }

    } finally {
        await client.close();
        console.log('Database initialization complete.');
    }
}

initDb().catch(console.error);
