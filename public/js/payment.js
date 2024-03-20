const orderFunc = (btn) => {
  console.log(btn)
  const amount = btn.previousSibling.previousSibling.value;
  
    fetch('https://api.idpay.ir/v1.1/payment', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': '94ef8761-d681-4f4c-8f18-a2b556eab425',
        'X-SANDBOX': 1,
      },
      body:JSON.stringify({
        order_id: '101',
        amount: amount,
        name: '',
        phone: '09382198592',
        mail: 'my@site.com',
        desc: 'توضیحات پرداخت کننده',
        callback: 'http://localhost:3000/checkout/success',
      }),
    })
      .then((result) => {
        return result.json();
      })
      .then((data) => {
        console.log(typeof data.link)
        var link = document.createElement('a');
        link.href = data.link;
        link.click()
      })
      .catch((err) => {
        console.log(err);
      });
  };
  