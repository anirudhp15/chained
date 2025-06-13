const output = `
wtf is this code?? app/page.tsx is importing itself, your favicon is 4GB and you have 4 node_modules. good luck LMFAO
`;

let i = 0;

function delayLog(text, delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(text);
      resolve();
    }, delay);
  });
}

async function run() {
  console.log(output);
}

run();
