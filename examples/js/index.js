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

  block.style.position = "absolute";
  block.style.left = (Math.random() * (document.documentElement.clientWidth)) + "px"
  block.style.top = (Math.random() * (document.documentElement.clientHeight)) + "px";
}