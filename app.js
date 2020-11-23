ethereum.autoRefreshOnNetworkChange = false;
ethereum.enable();

const provider = new ethers.providers.Web3Provider(window.ethereum);
let signer = provider.getSigner();
const contractAddress = "0x8F2580E00De52Dc409651B14268FAf3ca917D1a5";
const contractABI = [
  "function awardItem(address player, uint256 tokenId) public",
  "function balanceOf(address account) public view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function tokenByIndex(uint256 index) public view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) public"
];

let address; // address of the person logged in
let totalSupply;
let existingTokens = [];
let signerTokens = [];

const contract = new ethers.Contract(contractAddress, contractABI, provider);
const tokenWithSigner = contract.connect(signer);



main();

let colorTokens = [];

async function main() {
  address = await signer.getAddress();
  console.log(address);

  await displayOwnedColors(address);

  window.ethereum.on('accountsChanged', async function () {
    signerTokens = [];
    $('.color-token').remove();
    signer = provider.getSigner();
    address = await signer.getAddress();
    console.log(address);

    await displayOwnedColors(address);
  })
}

// take in an address, display the owned colors
async function displayOwnedColors(_address) {
  let balance = await contract.balanceOf(_address);
  balance = parseInt(balance);
  $("#address").text(address);

  // stores an array of numbers
  signerTokens = await getColorsByOwner(address, balance);

  let ownedColors = idsToColor(signerTokens);

  // create HTML elements with the correct colors
  let tokenCounter = 0;
  for(let i = 0; i < ownedColors.length; i++) {
    let t = ownedColors[i];
    let colorId = "token" + tokenCounter;
    
    let colorDiv =
    `
      <div class="color-token" id="${colorId}">
        <div class="color-token__tile"></div>
        <div class="color-token__text">
          <div class="color-token__num">${i+1}</div>
          <div class="color-token__hex">#abcdef</div>
        </div>
      </div>
      `

    $('.color-gallery').append(colorDiv);

    $(`#${colorId}`).children('.color-token__tile').css("background", `rgb(${t.r}, ${t.g}, ${t.b})`);
    $(`#${colorId}`).children('.color-token__text').children('.color-token__hex').text(`${rgbToHex(t.r, t.g, t.b)}`);
    
    tokenCounter++;
  }

  // send tokens
  $(".color-token").click(function(){
    let clickedToken = $(".color-token").index($(this));
    let clickedId = signerTokens[clickedToken];
    console.log(clickedId);

    $(".send-modal").toggle();
    $('#token-id').val(`${clickedId}`)
  });
}

$('.send-modal__close').click(function(){
  $('.send-modal').hide();
  $('#token-id').css("border", "none");
  $('#token-id').css("border-bottom", "1px solid darkgray");
  $('#recipient-address').css("border", "none");
  $('#recipient-address').css("border-bottom", "1px solid darkgray");
  $('#invalid-address').hide();
  $('#invalid-token').hide();
})
$('.send-modal__bg').click(function(){
  $('.send-modal').hide();
  $('#token-id').css("border", "none");
  $('#token-id').css("border-bottom", "1px solid darkgray");
  $('#recipient-address').css("border", "none");
  $('#recipient-address').css("border-bottom", "1px solid darkgray");
  $('#invalid-address').hide();
  $('#invalid-token').hide();
})

$('.send-modal__btn').click(function(){
  sendToken();
})

function sendToken() {
  let recipAddress = $('#recipient-address').val();
  let token = +$('#token-id').val();

  if(verifyTokenId(token) && verifyAddress(recipAddress)){
    tokenWithSigner.safeTransferFrom(address, recipAddress, token);
  }
}

function verifyTokenId(tokenId) {
  
  if(signerTokens.indexOf(tokenId) > -1) {
    console.log("valid tokenId")
    $('#token-id').css("border", "1px solid #9f9");
    $('#invalid-token').hide();
    return true;
  } else {
    console.log("invalid tokenId");
    $('#token-id').css("border", "1px solid #f99");
    $('#invalid-token').show();
    return false;
  }
}

function verifyAddress(addr) {
  
  let addressRegex = /^0x([A-Fa-f0-9]{40})$/
  if(addressRegex.test(addr)) {
    if(addr == address) {
      $('#recipient-address').css("border", "1px solid #f99");
      $('#invalid-address').text("Can't send to yourself").show();
      return false;
    }
    console.log("valid address")
    $('#recipient-address').css("border", "1px solid #9f9");
    $('#invalid-address').hide();
    return true;
  } else {
    console.log("invalid address");
    $('#recipient-address').css("border", "1px solid #f99");
    $('#invalid-address').text("Invalid address").show();
    return false;
  }
}

// returns an array of ints (the owned colors)
async function getColorsByOwner(_address, _balance) {

  let ids = [];

  for(let i = 0; i < _balance; i++) {
    let currToken = await contract.tokenOfOwnerByIndex(_address, i);
    currToken = parseInt(currToken);
    ids.push(currToken);
  }
  return ids;
}

// convert IDs to RGB Colors, return an array of array[r,g,b]
function idsToColor(_ids) {

  let colors = [];
  for(let i = 0; i < _ids.length; i++) {
    let id = "" + _ids[i];

    let r = parseInt(id.substr(1, 3));
    let g = parseInt(id.substr(4, 3));
    let b = parseInt(id.substr(7, 3));
    let color = {r: r, g: g, b:b}
    colors.push(color);
  }
  return colors;
}

function componentToHex(c) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

async function loadExisting() {
  totalSupply = await contract.totalSupply();
  totalSupply = parseInt(totalSupply);
  for(let i = 0; i < totalSupply; i++) {
    let currToken = await contract.tokenByIndex(i);
    existingTokens.push(parseInt(currToken));
  }
  console.log(existingTokens);
  return existingTokens;
}


function checkExisting(_existingTokens) {

  // generate a random color
  let randomR = Math.floor(Math.random()*256)
  let randomG = Math.floor(Math.random()*256)
  let randomB = Math.floor(Math.random()*256)

  let myColor = 1000000000 + randomR*1000000 + randomG*1000 + randomB;

  while(_existingTokens.indexOf(myColor) > 0)
  {
    randomR = Math.floor(Math.random()*256)
    randomG = Math.floor(Math.random()*256)
    randomB = Math.floor(Math.random()*256)

    myColor = 1000000000 + randomR*1000000 + randomG*1000 + randomB;
  }
  
  console.log("unique color: " + myColor);

  return myColor;
}


async function mintColor() {

  let timeOut;
  var interval = 250;
  let cycle = true;
  $('#loading').show();
  $('#generate-color').hide();

  setInterval(function(){
    if(cycle) {
      let randR = Math.floor(Math.random()*256);
      let randG = Math.floor(Math.random()*256);
      let randB = Math.floor(Math.random()*256);
      $('.minted-color__tile').css("background", `rgb(${randR}, ${randG}, ${randB})`)
      $('.minted-color__hex').text(`${rgbToHex(randR, randG, randB)}`);
    }
  }, interval);
  

  if(existingTokens.length == 0) {
    existingTokens = await loadExisting();
    timeOut = 0;
  } else {
    timeOut = 10000;
  }
  
  setTimeout(function(){
    cycle = false;
    $('#loading').hide();
    $('#generate-color').css("display", "block");
  
    let rewardId = checkExisting(existingTokens);
    let id = "" + rewardId;

    let r = parseInt(id.substr(1, 3));
    let g = parseInt(id.substr(4, 3));
    let b = parseInt(id.substr(7, 3));

    $('.minted-color__tile').css("background", `rgb(${r}, ${g}, ${b})`)
    $('.minted-color__hex').text(`${rgbToHex(r, g, b)}`);
    
    tokenWithSigner.awardItem(address, rewardId);
  
  }, timeOut);
  
}






let button = document.getElementById("generate-color")

button.addEventListener("click", async function(){
  // generate color, initiate transaction to mint ownership of color
  await mintColor();
})