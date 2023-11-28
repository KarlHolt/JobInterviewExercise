function write_to_user_gui(sender, message){
	// Sender = "user" | "gpt"
	let elem = document.createElement("div");
	let p = document.createElement("p");
	p.style.maxWidth = "80%";
	p.innerHTML = message;
	elem.classList = "chat_messasge " + sender;
	elem.appendChild(p);
	document.getElementById("viewer").appendChild(elem);
}

function encode(msg){
	let encoding = "";
	for(let i=0; i<msg.length; i++){
		const letter = msg[i];
		let encrypted_letter = "";

		if(RegExp(/[a-z]|[A-Z]/).test(letter)){
			encrypted_letter=letter
		} else if(letter == " "){
			encrypted_letter="%020";
		} else {
			let encoded_letter = String(letter.charCodeAt(0));
			while(encoded_letter.length < 3){
				encoded_letter = "0" + encoded_letter;
			}
			encrypted_letter = "%" + encoded_letter;
		}
		encoding += encrypted_letter;
	}
	return encoding;
}

async function ask_question(user_id, question, remember_history){
	const encoded_question = encode(question);
	const url = "http://localhost:3000/question?"+encoded_question+"/"+
		"user_id?"+user_id+"/"+"full?"+String(remember_history);
	let response = await fetch(url);
	let answer = await response.json();
	return answer;
}

async function question_request(){
	const raw_question = document.getElementById("question").value;
	write_to_user_gui("user", raw_question);
	document.getElementById("question").value = "";
	const raw_userid = document.getElementById("user_id_inputfield").value;
	let answer = await ask_question(raw_userid, raw_question, false);
	write_to_user_gui("gpt", answer);
	return answer;
}