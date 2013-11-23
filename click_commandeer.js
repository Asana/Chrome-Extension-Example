console.log("testtesttest")

document.onkeydown = keyDownHandler;
document.onkeyup = keyUpHandler;
document.onclick = clickHandler;

var asanaKeyDown = false;

function keyDownHandler(e){
  if (!e) var e = window.event;
  if ( (e.metaKey) ){
    console.log('shift pressed')
    asanaKeyDown = true;
  } else {
    asanaKeyDown = false;
  }
}

function keyUpHandler(e){
  if (!e) var e = window.event;
  if ( (e.metaKey) ){
    asanaKeyDown = true;
  } else {
    console.log("released")
    asanaKeyDown = false;
  }
}

function clickHandler(e){
  if (!e) var e = window.event;
  if ( (asanaKeyDown) || e.button == 1){
    console.log($(event.target));
    e.preventDefault();
  } 
}
