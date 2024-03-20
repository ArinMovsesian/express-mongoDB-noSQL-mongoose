const fs = require('fs');
const path = require('path');
// const stripe = require('stripe')('sk_test_51NUljpDKyO2hcEqtrDQqVA0um4tOWtsRDw5JXXoY31K7acUxCHgdXn74tsUlCLRFx2zPg1216snDYzdm9c50LOaZ004AlO8j2v');

const PDFDocument = require('pdfkit');

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
  
    Product.find()
      .countDocuments()
      .then(numProducts => {
        totalItems = numProducts;
        return Product.find()
          .skip((page - 1) * ITEMS_PER_PAGE)
          .limit(ITEMS_PER_PAGE);
      })
      .then(products => {
        console.log(products)
        res.render("shop/product-list", {
          prods: products,
          pageTitle: "All Products",
          path: "/products",
          currentPage: page,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
      })
      .catch(err => {
         //****** middle ware solution ******/
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
         //****** middle ware solution ******/
      });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch((err) => {
      //****** middle ware solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware solution ******/
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      console.log(products)
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // console.log("user", user);
      // console.log("cart", user.cart.items);
      const products = user.cart.items;
      // console.log(products)
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch((err) => {
      //****** middle ware solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware solution ******/
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      //****** middle ware solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware solution ******/
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .then(user => {
      products = user.cart.items;
      total = 0;
      console.log('pro', products)
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });

      //******** stripe payment ********//
      // return stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: products.map(p => {
      //     return {
      //       name: p.productId.title,
      //       description: p.productId.description,
      //       amount: p.productId.price * 100,
      //       currency: 'usd',
      //       quantity: p.quantity
      //     };
      //   }),
      //   success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
      //   cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
      // });
       //******** stripe payment ********//
      res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          totalSum: total,
      });
    })
    // .then((session) => {
    //   res.render('shop/checkout', {
    //     path: '/checkout',
    //     pageTitle: 'Checkout',
    //     products: products,
    //     totalSum: total,
    //     sessionId: session.id
    //   });
    // })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.getCheckoutSuccess = (req, res, next) => {
  req.user
  .populate("cart.items.productId")
  .then((user) => {
    console.log(user.cart.items);
    const products = user.cart.items.map((i) => {
      return {
        quantity: i.quantity,
        product: { ...i.productId._doc },
      };
    });
    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user, // mongoose pick user id
      },
      products: products,
    });
    return order.save();
  })
  .then((result) => {
    return req.user.clearCart();
  })
  .then(() => {
    res.redirect("/orders");
  })
  .catch((err) => {
    //****** middle ware solution ******/
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    //****** middle ware solution ******/
  });
}
exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      console.log(user.cart.items);
      const products = user.cart.items.map((i) => {
        return {
          quantity: i.quantity,
          product: { ...i.productId._doc },
        };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user, // mongoose pick user id
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      //****** middle ware solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware solution ******/
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    // .populate("user.userId")
    .then((orders) => {
      console.log("orders", orders);
      // console.log("user", user);
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch((err) => {
      //****** middle ware solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware solution ******/
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then(order => {
    if (!order) {
      return next(new Error('No order found.'));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error('Unauthorized!'))
    }
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    const pdfDoc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName +'"');
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(26).text('Invoice', {underline: true});
    pdfDoc.text('--------------------');
    let totalPrice = 0;
    order.products.forEach(prod => {
      totalPrice = totalPrice + prod.quantity * prod.product.price;
      pdfDoc.fontSize(14).text(prod.product.title + '-' + prod.quantity + '*' + '$' + prod.product.price);
    })
    pdfDoc.text('----')
    pdfDoc.fontSize(20).text('Total price $' + totalPrice)
    pdfDoc.end();

    // ****** Preloading Data ******//
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next();
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName +'"');
      //   res.send(data);
      // })
    // ****** Preloading Data ******//

    // ****** Streaming Data ******//
      // const file = fs.createReadStream(invoicePath);
      // console.log('file', file)
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName +'"');
      // file.pipe(res)
    // ****** Streaming Data ******//
  }).catch(err => next(err))
 
};
