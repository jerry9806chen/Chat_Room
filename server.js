const PORT = process.env.PORT || 8000;
const moment = require('moment');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

const MongoClient = require('mongodb').MongoClient;
var uri = "mongodb+srv://jerry:1234567890@cluster0.lf19s.mongodb.net/chats?retryWrites=true&w=majority";
const mongoClient = new MongoClient(uri, {useNewUrlParser:true, useUnifiedTopology:true});

app.use(express.static(__dirname + '/public'));

var clientInfo = {};
var collection = undefined;
var data = undefined;

mongoClient.connect(err => {
	if (err) {
		throw err;
	} else {
		collection = mongoClient.db("chats").collection("messages");
    	console.log('MongoDB connected!')
	}
})
// Sends current users to provided socket
function sendCurrentUsers (socket) {
	let info = clientInfo[socket.id];
	var users = [];

	if (typeof info === 'undefined') {
		return;
	}

	Object.keys(clientInfo).forEach(function (socketId) {
		var userInfo = clientInfo[socketId];

		if (info.room === userInfo.room) {
			users.push(userInfo.name);
		}
	});

	data = {
		name: 'System',
		text: 'Current users: ' + users.join(', '),
		timestamp: Date.now(),//moment().valueOf(),
		room: info.room
	};
	socket.emit('message', data);
	collection.insertOne(data).then(result=>{
		console.log("Message ", result.ops, " has been saved.");
	})
}

io.on('connection', function (socket) {
	let info = clientInfo[socket.id];
	console.log('User connected via socket.io!');

	socket.on('disconnect', function () {
		var userData = clientInfo[socket.id];

		if (typeof userData !== 'undefined') {
			socket.leave(userData.room);
			data = {
				name: 'System',
				text: userData.name + ' has left!',
				timestamp: Date.now(),//moment().valueOf(),
				room: userData.room
			};
			io.to(userData.room).emit('message', data);
			collection.insertOne(data).then(result=>{
				console.log("Message ", result.ops, " has been saved.");
			})
			delete clientInfo[socket.id];
		}
	});

	socket.on('joinRoom', function (req) {
		clientInfo[socket.id] = req;
		socket.join(req.room);

		// Clear chat file.
		fs.writeFile(`./public/chathistory/${req.room}ChatHistory`, '[', err => {
			console.log('File cleared.');
		})

		// Display chat room history
		console.log('printing history')
		//let histEntryCount = 0, failedEntryCount = 0;
		collection.find({room:req.room}).forEach(function(data){
			//console.log('printing history entry')
			socket.emit('message', data);
			fs.appendFile(`./public/chathistory/${req.room}ChatHistory`, JSON.stringify(data) + ",\n", err => {
				if (err) {
					//console.log('Error writing to file', err)
					//failedEntryCount++;
				} else {
					//console.log('Successfully wrote to file')
					//histEntryCount++;
				}
			})
		})
		/*console.log(`printed ${histEntryCount} entries`);
		console.log(`failed to print ${failedEntryCount} entries`);*/

		data = {
			name: 'System',
			text: req.name + ' has joined!',
			timestamp: Date.now(),//moment().valueOf(),
			room: req.room
		};
		socket.broadcast.to(req.room).emit('message', data);
		collection.insertOne(data).then(result=>{
			console.log("Message ", result.ops, " has been saved.");
			fs.appendFile(`./public/chathistory/${req.room}ChatHistory`, JSON.stringify(data) + ",\n", err => {
				if (err) {
					console.log('Error writing to file', err)
				} else {
					console.log('Successfully wrote to file')
				}
			})
		})
	});

	socket.on('message', function (message) {
		console.log('Message received: ' + message.text);

		if (message.text === '@currentUsers') {
			sendCurrentUsers(socket);
		} else {
			message.timestamp = moment().valueOf();
			io.to(clientInfo[socket.id].room).emit('message', message);	
			message.room = clientInfo[socket.id].room;
			collection.insertOne(message).then(result=>{
				console.log("Message ", result.ops, " has been saved.")
				fs.appendFile(`./public/chathistory/${message.room}ChatHistory`, JSON.stringify(message) + ",\n", err => {
					if (err) {
						console.log('Error writing to file', err)
					} else {
						console.log('Successfully wrote to file')
					}
				})
			});
		}
	});

	// timestamp property - JavaScript timestamp (milliseconds)

	socket.emit('message', {
		name: 'System',
		text: 'Welcome to the chat application!',
		timestamp: Date.now()//moment().valueOf()
	});
});

http.listen(PORT, function () {
	console.log('Server started!');
});