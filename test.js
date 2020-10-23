const queue = new TinyQueue([1,2,3,4,5]);
let a = 0;
function promiseFac(n){
    return new Promise((resolve) => {
        if(n === 0){
            resolve(1);
        } else {
            promiseFac(n-1).then((result) => {
                queue.push(result);
                console.log(queue);
                resolve(result * n);
            })
        }
    })
} 


promiseFac(5).then((result) => {console.log(result); console.log(queue);});
