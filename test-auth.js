import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function test() {
    try {
        console.log('Registering...');
        const regRes = await axios.post(`${API_URL}/auth/register/student`, {
            username: 'testuser2',
            password: 'password123',
            name: 'Test User 2',
            email: 'test2@example.com',
            phone: '123',
            birthDate: '2000-01-01',
            weight: 70,
            height: 170,
            objective: 'Fitness',
            athleteType: 'amador',
            planType: 'mensal',
            paymentDay: 10,
            joinDate: '2023-01-01'
        });
        console.log('Registration success:', regRes.data);

        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'testuser2',
            password: 'password123'
        });
        console.log('Login success:', loginRes.data);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

test();
