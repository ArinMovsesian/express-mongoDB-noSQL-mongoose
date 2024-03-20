const Product = require("../models/product");
const { validationResult } = require("express-validator/check");
const fileHelper = require("../util/file");
const mongoose = require("mongoose");
// const Minio = require('minio');

exports.getAddProduct = (req, res, next) => {
  // if (!req.session.isLoggedIn) {
  //   return res.redirect("/login");
  // }
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
    // isAuthenticated: req.session.isLoggedIn,
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.imageUrl;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  console.log("image: ", image);
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        // imageUrl: imageUrl,
        price: price,
        description: description,
      },
      errorMessage: "Attacked file is not an image.",
      validationErrors: [],
      // isAuthenticated: req.session.isLoggedIn,
    });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        // imageUrl: imageUrl,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      // isAuthenticated: req.session.isLoggedIn,
    });
  }
  const imageUrl = image.path;
  const product = new Product({
    // _id: new mongoose.Types.ObjectId("63692f5ecf3c71757cbf21b9"),
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      // console.log(result);
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      // console.log("An error occurred!");
      // console.log(err);

      //****** first solution ******/
      // return res.status(500).render("admin/edit-product", {
      //   pageTitle: "Add Product",
      //   path: "/admin/add-product",
      //   editing: false,
      //   hasError: true,
      //   product: {
      //     title: title,
      //     imageUrl: imageUrl,
      //     price: price,
      //     description: description
      //   },
      //   errorMessage: 'DataBase operation failed, pls try again',
      //   validationErrors: []
      // });
      //****** first solution ******/

      //****** second solution ******/s
      // res.redirect('/500');
      //****** second solution ******/

      //****** middle ware solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware solution ******/
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
        // isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      //****** middle ware error handling solution ******/
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      //****** middle ware error handling solution ******/
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  // const updatedImageUrl = req.body.imageUrl;
  const updateImage = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        // imageUrl: updatedImageUrl,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      // isAuthenticated: req.session.isLoggedIn,
    });
  }
  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (updateImage) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = updateImage.path;
      }
      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
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

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        // isAuthenticated: req.session.isLoggedIn,
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

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId).then(product => {
    if (!product) {
      return next(new Error('product not found'));
    } 
    fileHelper.deleteFile(product.imageUrl);
    return Product.deleteOne({ _id: prodId, userId: req.user._id })
  }).then(() => {
    console.log("DESTROYED PRODUCT");
    res.redirect("/admin/products");
  })
  .catch((err) => {
    //****** middle ware solution ******/
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    //****** middle ware solution ******/
  });
    
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then(product => {
    if (!product) {
      return next(new Error('product not found'));
    } 
    fileHelper.deleteFile(product.imageUrl);
    return Product.deleteOne({ _id: prodId, userId: req.user._id })
  }).then(() => {
    console.log("DESTROYED PRODUCT");
    res.status(200).json({
      message: 'Success'
    });
  })
  .catch((err) => {
    res.status(500).json({
      message: 'Failed!'
    });
  });
    
};
