const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser')
let groups = []
server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
// Routing
app.use(express.static(path.join(__dirname, 'public')));

app.post("/join", (req,res)=>{
    console.log(req.body)
    res.redirect(`/?username=${req.body.username}&groupName=${req.body.groupName}&password=${req.body.password}`)
})

app.post("/create",(req,res)=>{
    res.redirect(`/create.html?username=${req.body.username}&groupName=${req.body.groupName}&password=${req.body.password}`)

})

io.on('connection', (socket) => {
    
    socket.on('join-or-create', (data) => {
    let newGroup = true

    groups.map((group)=>{
        if(group.groupName == data.groupName){
            if(group.password == data.password){
                socket.join(data.groupName)
                newGroup=false
                socket.groupName = data.groupName
                socket.username = data.username
                socket.emit("joined-to-group-success "+ data.username, "Joined to existing group")
            }
            else{
                newGroup=false
                socket.emit("invalid-password "+ data.username, "Invalid group password")
            }
            
        }
    })
    
    if(newGroup){
        socket.groupName = data.groupName
        socket.username = data.username
        groups.push(data)
        socket.emit("created-new-group "+ data.username, "Created new group")
    }

})

    socket.on('new message', (data) => {
        socket.to(socket.groupName).emit('new message',{
            username: socket.username,
            message: data
        })
  });

});