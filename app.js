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

let address; // address of the current metamask account
let totalSupply; // total supply of COLR of current metamask account
let existingTokens = []; // an array of ALL minted color tokens
let signerTokens = []; // an arry of all minted color tokens owned by current metamask account

const contract = new ethers.Contract(contractAddress, contractABI, provider);
const tokenWithSigner = contract.connect(signer);

main();

// Event Listeners
$('.send-modal__close').click(closeSendWindow)
$('.send-modal__bg').click(closeSendWindow)
$('.send-modal__btn').click(sendToken)
$('#generate-color').click(async function(){
  // generate color, initiate transaction to mint ownership of color
  await mintColor();
})


async function main() {
  address = await signer.getAddress();
  console.log("Current MetaMask Wallet: " + address);
  await displayOwnedColors(address);
  $("#address").text(address);

  // detect if metamask account has changed and swap out color tokens
  window.ethereum.on('accountsChanged', async function () {
    
    // clear the signerTokens array
    signerTokens = [];

    // remove all the color tokens from the DOM
    $('.color-token').remove();

    // set the signer based on the new account
    signer = provider.getSigner();
    address = await signer.getAddress();
    console.log("Current MetaMask Wallet: " + address);

    // display the owned tokens of the new account
    await displayOwnedColors(address);
  })
}

// take in an address, display the owned colors at the bottom of the screen
// Tokens are sorted (loosely) by color
async function displayOwnedColors(_address) {
  let balance = await contract.balanceOf(_address);
  balance = +balance;
  
  // stores an array of numbers (the tokenIds owned by the current account)
  signerTokens = await getColorsByOwner(address, balance);

  // converts tokenIds (numbers) into JS Objects with more accessible color
  // values (red, green, blue). Stores JS Objects in an array
  let ownedColors = idsToColor(signerTokens);

    // loop through all all the owned tokens
  for(let i = 0; i < ownedColors.length; i++) {
    
    // store the current token in a temporary variable
    let t = ownedColors[i];

    // create a unique ID (HTML selector) (eg. token1, token2,...,tokenN)
    let colorId = "token" + i;

    // Construct a color token and add it to the DOM
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
  }
  
  // Display the send window after clicking on a color token. This click event needs to be inside the displayOwnedColors function because it depends on the existence of ".color-token" objects, which are created dynamically inside this function.
  $(".color-token").click(function(){
    let clickedToken = $(".color-token").index($(this));
    let clickedId = signerTokens[clickedToken];
    console.log(clickedId);

    $(".send-modal").toggle();
    $('#token-id').val(`${clickedId}`)
  });
}

// Reset some CSS upon closing the send Window
function closeSendWindow() {
  $('.send-modal').hide();
  $('#token-id').css("border", "none");
  $('#token-id').css("border-bottom", "1px solid darkgray");
  $('#recipient-address').css("border", "none");
  $('#recipient-address').css("border-bottom", "1px solid darkgray");
  $('#invalid-address').hide();
  $('#invalid-token').hide();
}

// Send the token after verifying the address and token ID are valid.
function sendToken() {
  let recipAddress = $('#recipient-address').val();
  let token = +$('#token-id').val();

  if(verifyTokenId(token) && verifyAddress(recipAddress)){
    tokenWithSigner.safeTransferFrom(address, recipAddress, token);
  }
}

// verify the token to be sent is owned by the sender
function verifyTokenId(tokenId) {
  
  // checks all the tokens owned by the current account.
  // If they don't own the token, signerTokens.indexOf(tokenId) returns -1

  // if the account owns the token...
  if(signerTokens.indexOf(tokenId) > -1) {
    $('#token-id').css("border", "1px solid #9f9");
    $('#invalid-token').hide();
    return true;
  }

  // if the account doesn't own the token...
  else {
    $('#token-id').css("border", "1px solid #f99");
    $('#invalid-token').show();
    return false;
  }
}

// check to make sure the user has entered a valid Ethereum Wallet Address
// Note: this doesn't verify if the address actually exists, it just makes sure that the format of the input is correct (eg., looks like 0x6935874D51CD8160791566C7741ac8305255d263)
function verifyAddress(addr) {

  // This is called a "Regex Pattern". This pattern checks if the address the person is sending to is a standard ETH wallet address (starts with 0x, followed by 40 characters that can be any character from 0-9, a-f and A-F)
  // returns true if the address is valid, false if not.
  let addressRegex = /^0x([A-Fa-f0-9]{40})$/
  if(addressRegex.test(addr)) {
    // makes sure the user isn't trying to send to themselves
    if(addr == address) {
      $('#recipient-address').css("border", "1px solid #f99");
      $('#invalid-address').text("Can't send to yourself").show();
      return false;
    }
    $('#recipient-address').css("border", "1px solid #9f9");
    $('#invalid-address').hide();
    return true;
  }
  // if the address is not valid..
  else {
    $('#recipient-address').css("border", "1px solid #f99");
    $('#invalid-address').text("Invalid address").show();
    return false;
  }
}

// returns an array of numbers (the owned colors)
async function getColorsByOwner(_address, _balance) {
  let ids = [];
  for(let i = 0; i < _balance; i++) {
    let currToken = await contract.tokenOfOwnerByIndex(_address, i);
    currToken = parseInt(currToken);
    ids.push(currToken);
  }
  return ids.sort();
}

// convert IDs to RGB Colors, return an array of colors
function idsToColor(_ids) {

  // create a temporary array for storing colors
  let colors = [];

  // loop through all the imported IDs
  for(let i = 0; i < _ids.length; i++) {
    // convert ID to a string.
    let id = "" + _ids[i];

    // extracts each color from the ID (e.g. 1255000255)
    let r = parseInt(id.substr(1, 3)); // index 1, 2, 3 == 255
    let g = parseInt(id.substr(4, 3)); // index 4, 5, 6 == 000
    let b = parseInt(id.substr(7, 3)); // index 7, 8, 9 == 255
    let color = {r: r, g: g, b:b} // store the colors in a JS object
    colors.push(color); // add the JS object to the colors array
  }
  return colors; // return an array of JS objects
}

// function to convert a decimal number to a hex number
function componentToHex(c) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

// function to convert an RGB color to Hex color
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Mint the unique color
async function mintColor() {

  let timeOut;
  let interval = 250;
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
    $('#generate-color').show();
  
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

// Load all pre-existing tokens into an array (existingTokens)
// Note: this is a time consuming operation that takes longer depending on the amount of existing tokens, since the tokenByIndex() function can only retrieve one token at a time (asynchronously). Thus, this is only called once, after a user has clicked Generate Color. Once the existingTokens array has been loaded, no need to re-load it.
async function loadExisting() {
  
  // get the total supply of existing tokens
  totalSupply = await contract.totalSupply();
  totalSupply = parseInt(totalSupply);

  // loop through all existing tokens, storing their IDs in an array. This is so we can check later to make sure we don't generate an ID that already exists.
  for(let i = 0; i < totalSupply; i++) {
    let currToken = await contract.tokenByIndex(i);
    existingTokens.push(parseInt(currToken));
  }
  return existingTokens;
}

// generates random colors until a unique (unowned) color is generated
function checkExisting(_existingTokens) {

  // generate an initial random color
  let randomR = Math.floor(Math.random()*256)
  let randomG = Math.floor(Math.random()*256)
  let randomB = Math.floor(Math.random()*256)

  // combine random RGB values into a single number
  let myColor = 1000000000 + randomR*1000000 + randomG*1000 + randomB;

  // generate new random Colors until creating a new color
  // a while loop is sort of like an if statement, except that it executes repeatedly until its condition is satisfied, unlike an if-statement, which only excecutes one time.
  while(_existingTokens.indexOf(myColor) > 0)
  {
    randomR = Math.floor(Math.random()*256)
    randomG = Math.floor(Math.random()*256)
    randomB = Math.floor(Math.random()*256)

    myColor = 1000000000 + randomR*1000000 + randomG*1000 + randomB;
  }
  console.log("Minted color: " + myColor);
  return myColor;
}