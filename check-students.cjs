const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function check() {
    try {
        const response = await axios.get(`${API_URL}/students`);
        console.log('Students:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

check();
