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

// Making a global mapping to store all conversations in.
const conversations = new Map;

// Because we let user set his own id, we have a chance that two users get the same id.
// This would result, in weird behaviour.
function user_connect(user_id: string){
	const single_conversation = {
		user_questions: [],
		gpt_answers: []
	}
	conversations.set(user_id, single_conversation);
}

// Decoding from ansi values fitted to 3 digits.
function decode(encoded_string: string){
	let indexs = encoded_string.match(/%[0-9][0-9][0-9]/g)
	if(indexs == null){return encoded_string;}
	for(let i=0; i<indexs.length;i++){
		const char_code = Number(indexs[i].slice(1));
		let character = String.fromCharCode(char_code);
		if(char_code == 20){
			character = " ";
		}
		encoded_string=encoded_string.replaceAll(indexs[i], character);
	}
	return encoded_string;
}

async function handle_requests(req:any, res:any){
	const url = req["url"]

	if(url.includes("/question?")) {
		let user_id = url.match(/user_id\?([a-z]|[A-Z]|-|_|[0-9])*/);
		try{
			user_id = user_id[0].slice("user_id?".length);
		} catch {
			console.log("Got request for question, but no user_id attacted")
			user_id = "lol"
		}
		
		let question = url.match(/question\?([a-z]|[A-Z]|%[0-9][0-9][0-9]| )*/);
		question = question[0].slice("question?".length);
		question = decode(question)

		let full_conversation = url.match(/full\?(true|false)/);
		try{
			full_conversation = full_conversation[0].slice("full?".length);
		} catch {
			full_conversation = false;
		}
		const value = await send_question(full_conversation, question, user_id);

		if(!conversations.has(user_id)){
			user_connect(user_id);
		}
		console.log(value);
		const answer = value["choices"][0]["message"]["content"];
		let temp = conversations.get(user_id);
		temp["user_questions"].push(question);
		temp["gpt_answers"].push(answer);
		conversations.set(user_id, temp);

		console.log(question)
		console.log(answer)

		res.send(answer);
	} else {
		// Default case send homepage.
		res.sendFile("/home/fony/Git/JobInterviewExercise/home.html");
	}
}

async function send_question(remember_conversation: boolean, question: string, user_id: string){
	let formatted_question = ""
	if(remember_conversation && conversations.has(user_id)){
		formatted_question = "We have had the following conversation:\n"

		const conversation = conversations.get(user_id);
		for(let i=0; i<conversation["user_questions"].length; i++){
			let temp = "me > " + conversation["user_questions"][i] + "\n";
			temp += "you > " + conversation["gpt_answers"][i] + "\n";
			formatted_question += temp;
		}

		formatted_question = formatted_question + "\nBased on this, answer the question: " + question;
	} else {
		formatted_question = question
	}

	const params: OpenAI.Chat.ChatCompletionCreateParams = {
 		messages: [{ role: 'user', content: formatted_question }],
 		model: 'gpt-3.5-turbo',
 	}; 
	const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
	
	return chatCompletion;
}

// Using '*' to handle all get results.
app.get('*', async (req: any, res: any) => {handle_requests(req, res)});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});