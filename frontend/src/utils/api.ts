import axios from 'axios';

export const getAPI = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};