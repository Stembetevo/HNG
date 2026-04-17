import axios from "axios";

const AGIFY_URL = 'https://api.agify.io/';
const NATIONALIZE_URL = 'https://api.nationalize.io/'

export async function fetchProfileService(name){
    const response = await axios.get(
        [AGIFY_URL,NATIONALIZE_URL],{
            params: {name},
            timeout:5000
        }
    );
    return response.data
}