import axios from 'axios';

const instance = axios.create({
    baseURL: 'https://cow-farm.onrender.com/api',
});

export default instance;
