const express = require('express');
import * as fs from 'fs';
import OpenAI from 'openai';

// The sad realasation has come to me, that the typescript library I'm using does not
// seem to have support for assistant, and therefore I can not have it renember outputs
// and inputs. I will do that manually.


// Load keys
let rawData = fs.readFileSync('keys.json', 'utf8');
let keys = JSON.parse(rawData);

// Initialize OpenAI
const openai = new OpenAI({
	organization: keys["organization"],
	apiKey: keys["openai"],
});

// Server set up
const app = express();
const port = 3000;




app.get('/', async (req: any, res: any) => {
	res.send(req)
	//res.send(await main());
  	res.sendFile("/home/fony/Git/JobInterviewExercise/home.html");
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});


// async function main() {
// 	const params: OpenAI.Chat.ChatCompletionCreateParams = {
// 	  messages: [{ role: 'user', content: 'Say this is a test' }],
// 	  model: 'gpt-3.5-turbo',
// 	};  
// 	const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
// 	return chatCompletion;
// }

// main().then((value) => {
// 	console.log(value);
// })