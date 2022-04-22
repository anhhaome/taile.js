module.exports = {
  input: './input.css',
  output: './public/assets/css/output.min.css',

  content: [
    './public/**/*.{html,ejs}',
    './views/**/*.{html,ejs}'
  ],

  theme: {
    extend: {}
  },

  plugins: []
};
