const express = require('express');
import * as fs from 'fs';
import OpenAI from 'openai';
import { Client } from 'ts-postgres';

// The sad realasation has come to me, that the typescript library I'm using does not
// seem to have support for assistant, and therefore I can not have it renember outputs
// and inputs. I will do that manually.
// The even sadder realasation has come to me that, they in fact renember it.
// But fine, gives me a reason to make a user and a database.

// Sets the path for the repository
const super_url = process.env.PWD;

// Load keys
const rawData = fs.readFileSync('keys.json', 'utf8');
const keys = JSON.parse(rawData);


// Put this into a function, but it seems, that new instance still have same chat memory
// Probably because my organization is personal.
function Initialize_gpt(){
	// Initialize OpenAI
	// I just realised that this opens a new session!!!!!!!!!!!
	// For a bigger implementation with multiple users, one of these should be made for each user.
	return new OpenAI({
		organization: keys["organization"],
		apiKey: keys["openai"],
	});
}
const openai = Initialize_gpt();
send_question(false, "All of your answers should be formatted with html objects instead.", "");

// Server set up
const app = express();
const port = 3000;

// Because we let user set his own id, we have a chance that two users get the same id.
// This would result, in weird behaviour.

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

		const answer = value["choices"][0]["message"]["content"];
		if(user_id != ""){
			// Check if user exist
			const query = `SELECT user_id FROM user_table WHERE user_id='${user_id}'`;
			const error_for_user_exist = `error happened when checking for existing user ${user_id}`;
			let result = await communicate_with_database(query, error_for_user_exist);
			if(result != null && result["rows"].length == 0){
				// create user
				const password = "";
				let query = ""
				if(password == ""){
					query = `INSERT INTO user_table(user_id) VALUES('${user_id}')`;
				} else {
					query = `INSERT INTO user_table(user_id, password) VALUES('${user_id}', '${password}')`;
				}
				const error = `error happened when creating user with id:${user_id}`;
				await communicate_with_database(query, error);
			}

			// Here I would want to check if the password is correct, but since it is not implemented it doesn't matter
			const insert_user_question = `INSERT INTO messages(user_id, sender, message, time) VALUES('${user_id}', 'user', '${question}', current_timestamp)`;
			const error=`error happened when inserting message for user:${user_id}`;
			await communicate_with_database(insert_user_question, error);
			const insert_answer = `INSERT INTO messages(user_id, sender, message, time) VALUES('${user_id}', 'gpt', '${answer}', current_timestamp)`;
			await communicate_with_database(insert_answer, error);
		}


		// The funny thing is that if two requests are close engouh together, from two users
		// This would be messed up. 
		console.log("I was asked: " +question);
		console.log("ChatGPT answered with: " + answer);

		res.send(JSON.stringify(answer));
	} else if(fs.existsSync(super_url+url)) {
		// Could be changed so we have a list with restricted files, and all send the song.
		if(url.includes("keys.json")){
			res.send("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		} else {
			res.sendFile(super_url+url);
		}
	} else if(url.includes("/database_request")){
		let user_id = url.match(/user_id\?([a-z]|[A-Z]|-|_|[0-9])*/);
		try{
			user_id = user_id[0].slice("user_id?".length);
		} catch {
			console.log("Got request for the database, but no user_id attacted")
		}
		// retrieve messages
		const query = `SELECT * FROM messages WHERE user_id='${user_id}'`;
		const error=`error happened when retrieving messages for user:${user_id}`;
		res.send(await communicate_with_database(query, error));
	} else {
		console.log(url);
		// Default case send homepage.
		res.sendFile(super_url+"/index.html");
	}
}

async function send_question(remember_conversation: boolean, question: string, user_id: string){
	/*
	This is from a forgotten time
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
	} */
	const formatted_question = question

	const params: OpenAI.Chat.ChatCompletionCreateParams = {
 		messages: [{ role: 'user', content: formatted_question }],
 		model: 'gpt-3.5-turbo',
 	}; 
	const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
	
	return chatCompletion;
}

/* 
// Check for correct password
const query = "SELECT password FROM user_table WHERE user_id=${user_id}";
const error = "error happened when retriving password for user ${user_id}";
await communicate_with_database(query, error); */

async function communicate_with_database(query: string, error_msg: string){
	const client = new Client({database: "chatgpt_userhistory"});
	client.connect();
	let result = null;
	try {
		result = await client.query(query);
	} catch(err) {
		console.log("Error happend:", err);
		console.log("Error message:", error_msg);
	} finally {
		await client.end();
	}
	return result;
}

// Using '*' to handle all get results.
app.get('*', async (req: any, res: any) => {handle_requests(req, res)});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});