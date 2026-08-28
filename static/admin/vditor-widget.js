(function () {

  const VditorWidget = createClass({
    
    getInitialState() {
      return {
        value: this.props.value || ""
      };
    },


    componentDidMount() {

      this.editor = new Vditor(this.el, {

        height: 600,

        mode: "wysiwyg",

        cache: {
          enable: false
        },

        value: this.state.value,


        input: (value) => {
          this.setState({
            value
          });

          this.props.onChange(value);
        }

      });

    },


    render() {

      return h(
        "div",
        {
          ref: el => {
            this.el = el;
          }
        }
      );

    }

  });


  CMS.registerWidget(
    "vditor",
    VditorWidget
  );


})();
