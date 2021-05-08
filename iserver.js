require("dotenv").config();
const express = require("express")
const app = express();
const server = require("http").Server(app)
const io = require("socket.io")(server)
const { v4: uuidV4 } = require('uuid');
const { config } = require("process");
const { Socket } = require("dgram");
const { userInfo } = require("os");
const PORT = process.env.PORT || 5001

let room = []
let me = false
let cours =[]

app.set("view engine","ejs")
app.use(express.static("public"))
app.use(express.urlencoded({
	extended : true
}))

app.get('/panel',(req,res)=>{
	success = cours.length<1 ? false : true
	res.render("pages/panel",{cours,success});
})

app.post('/panel',(req,res)=>{
	success = cours.length<1 ? false : true
	res.render("pages/panel",{cours,success});
})

app.post('/confirm',(req,res)=>{
	if (req.body.confirm) {
		nameOfRoom = cours.find(cours => cours.roomToken===req.body.roomToken)
		res.render("pages/panel",{
			roomName : nameOfRoom.roomName,
			roomToken : req.body.roomToken,
			userName : req.body.userName,
			userRole : "STUDENT",
			start : true
		})
	}
})

app.get('/room',(req,res)=>{
	res.render("pages/roomProd");
})

app.get('/',(req,res)=>{
	res.render("pages/teachtool",{roomToken:uuidV4()});
})

app.post('/cours',(req,res)=>{
	let roomName = req.body.cours
	let roomToken = req.body.roomToken
	let coursIn = {
		roomToken : roomToken,
		roomName : roomName
	}
	cours.push(coursIn)
	res.render("pages/teachtool",{
									roomName:roomName,
									roomToken:roomToken,
									userName : req.body.username,
									userRole:"TEACHER",
									success:true
								})
})

server.listen(PORT,()=>{
	console.log(`Server running on port ${PORT} : liveSchoolbac-bkp`)
})

io.on("connection",(socket) => {

	me = socket.id
	
	socket.on("join-room",(roomId, user) => {

		let userRoom ={
			userRole : user.userRole,
			userName : user.userName,
			roomToken : roomId,
			roomName : user.roomName,
			peerToken : user.peerToken,
			socketToken : me,
			roomTime : 100
		}

		room.push(userRoom);
		socket.join(roomId);
		
		//Timer ROOM

		let dateAssign = (new Date()).valueOf()
		roomTimeleader = room.find( userT => userT.userRole === 'TEACHER')
		roomTokenCheck = room.find( userT => userT.roomToken === roomId).roomToken
		userInfoCheck = room.find( userT => userT.peerToken === user.peerToken)
		userInfoCheck.roomTime = (roomTimeleader.roomTime===100 && roomTokenCheck) ? dateAssign : roomTimeleader.roomTime
		roomTimeCheck = room.find( user => user.userRole === 'TEACHER').roomTime

		socket.emit("room timing",roomTimeCheck)
		//------------------------------------------------------------
		
		let leaderSocketToken = room.find( user => user.userRole === 'TEACHER').socketToken
		
		socket.to(leaderSocketToken).broadcast.emit("user-connected",user.peerToken)
		
		socket.on("QUESTION-AUTHORIZED", socketToken => {
			let leaderPeerToken = room.find( user => user.userRole === 'TEACHER').peerToken
			let studentPeerToken = room.find( user => user.socketToken === socketToken).peerToken
			socket.to(socketToken).emit("QUESTION-AUTH",{studentPeer:studentPeerToken,leaderPeer:leaderPeerToken})
		})

		socket.on('user abort question',()=>{
			socket.to(roomId).broadcast.emit('user abort question');
		})

		socket.on('disconnect',()=>{
			let hostCheck = room.find( users => users.peerToken===user.peerToken && users.userRole === 'TEACHER')
			console.log("HOST DISCONNECTED : ",hostCheck);
			
			if(hostCheck){
				console.log("LE PROF SE DECONNECTE");
				socket.to(roomId).broadcast.emit('host-disconnected')
				console.log("HOST COURSE DISCONNECTED :",cours);
				cours = cours.filter( cours => cours.roomToken !== roomId)
				console.log("HOST COURSE DISCONNECTED FILTER :",cours);
			}
			
			room = room.filter( users => users.peerToken !== user.peerToken)
			console.log("DECONNEXION : ",user.peerToken);
			console.log(room);
			socket.to(roomId).broadcast.emit('user-disconnected',user.peerToken)
		})

	})
	
	socket.on("QUESTION-SOLLICITAION",(peerToken)=>{
		let studentToken = room.find( user => user.peerToken === peerToken)
		console.log("MOI AUTHOR",studentToken);
		let leaderSocketToken = room.find( user => user.userRole === 'TEACHER').socketToken
		socket.to(leaderSocketToken).emit("QUESTION-SOLLICITATION", studentToken)
	})	
})