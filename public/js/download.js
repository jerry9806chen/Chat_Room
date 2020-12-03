function download(roomName) {
    window.open(`localhost:8000/chathistory/${roomName}ChatHistory`, "_blank");
}

function downloadLink(roomName) {
    document.getElementById('download_history').style.visibility = "hidden";
    document.getElementById('issueStatement').style.visibility = "visible";
    roomName = roomName.replace(" ","%20");
    document.getElementById('downloadLink').innerHTML = `localhost:8000/chathistory/${roomName}ChatHistory`;
}