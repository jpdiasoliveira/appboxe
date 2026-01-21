import axios from 'axios';

async function testRegistration() {
    try {
        const response = await axios.post('http://localhost:3001/api/auth/register/student', {
            username: 'teststudent_' + Date.now(),
            password: 'password123',
            name: 'Test Student',
            email: 'test@example.com',
            phone: '11999999999',
            birthDate: '2000-01-01',
            height: 180,
            weight: 80,
            objective: 'Treinar boxe',
            planType: 'monthly',
            athleteType: 'functional',
            paymentDay: 10
        });
        console.log('Registration Success:', response.data);
    } catch (error) {
        console.error('Registration Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRegistration();
