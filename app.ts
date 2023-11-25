const express = require('express');
import * as fs from 'fs';
const Configuration = require('openai');
const OpenAIApi = require('openai');

let rawData = fs.readFileSync('keys.json', 'utf8');
let jsonData = JSON.parse(rawData);
const app = express();
const port = 3000;

const configuration = new Configuration({
	organization: jsonData["organization"],
	apiKey: jsonData["openai"],
});

async function hehe(){
	const openai = new OpenAIApi(configuration);
	const response = await openai.listEngines();
	return response
}


app.get('/', (req: any, res: any) => {
	res.send(hehe());
  	res.sendFile("/home/fony/Git/small_project/home.html");
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});