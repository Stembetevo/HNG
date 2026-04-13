import axios from 'axios'

const GENDERIZE_URL = "https://api.genderize.io"

export async function fetchGenderPrediction(name){
    const response = await axios.get(GENDERIZE_URL,{
        params:{name},
        timeout:5000
    });

    return response.data;
}