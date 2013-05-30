define(
  ["require", "./scripts/vendor/sencha-touch-1.1.0/sencha-touch.js"],
  function (require) {
    if (Ext.is.Tablet && 0) {
      require(["./tablet/index"]);
    } else if (Ext.is.Phone && 0) {
      require(["./phone/index"]);
    } else {
      require(["./desktop/index"]);
    }
  }
);
