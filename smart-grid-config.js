var smartgrid = require("smart-grid");

/* It's principal settings in smart grid project */
var settings = {
  outputStyle: "scss",
  columns: 12, // number of grid columns
  offset: "3%", // gutter width
  mobileFirst: true,
  mixinNames: {
    container: "container"
  },
  container: {
    fields: "30px" // side fields
  },
  breakPoints: {
    xs: {
      width: "320px"
    },
    sm: {
      width: "576px"
    },
    md: {
      width: "768px"
    },
    lg: {
      width: "992px"
    },
    xl: {
      width: "1200px"
    }
  }
};

smartgrid("./src/styles/mixins", settings);
