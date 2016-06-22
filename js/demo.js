document.addEventListener("click", function(e) {
    let target = e.target;

    if (target.matches('.block'))
    {
      var letters = '0123456789ABCDEF'.split('');
      var color = '#';
      for (var i = 0; i < 6; i++ ) {
          color += letters[Math.floor(Math.random() * 16)];
      }

      target.style.backgroundColor = color;
    }
});

let blocks = document.getElementsByClassName("block");
for (let i = 0; i < blocks.length; i++)
{
  let block = blocks[i];
  let blockRect = block.getBoundingClientRect();

  let container = block.parentElement;
  let rect;
  while(container != null) 
  {
    if (container.nodeName === "body") 
    {
      rect = container.getBoundingClientRect();
      break;
    }

    let style = window.getComputedStyle(container);
    if (style.position == "relative" || style.position == "absolute") {
      rect = container.getBoundingClientRect();
      break;
    }

    container = container.parentElement;
  }

  block.style.position = "absolute";
  block.style.left = (Math.random() * (rect.width - blockRect.width)) + "px"
  block.style.top = (Math.random() * (rect.height - blockRect.height)) + "px";
}