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
  //var isAsanaLink = ($(e.target).attr("href").indexof("app.asana.com") != -1);
  if ( ((asanaKeyDown) || e.button == 1) && $(e.target).prop("tagName") == "A"){
    console.log("is link");
    if ($(e.target).prop("href").indexOf("app.asana.com") != -1) {
      console.log("asana link clicked!")
      e.preventDefault();
    }
    console.log($(event.target));
  } 
}
