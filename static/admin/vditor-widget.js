(function () {

  const VditorWidget = createClass({

    getInitialState() {
      return {
        value: this.props.value || ""
      };
    },


    componentDidMount() {

      this.editor = new Vditor(this.el, {

        height: "calc(100vh - 200px)",

        mode: "wysiwyg",

        cache: {
          enable: false
        },


        value: this.state.value,


        toolbar: [

          "headings",
          "bold",
          "italic",
          "strike",
          "|",

          "quote",
          "list",
          "ordered-list",

          "|",

          "check",
          "table",
          "link",

          "|",

          "code",
          "inline-code",

          "|",

          "upload",
          "record",

          "|",

          "undo",
          "redo",

          "|",

          "fullscreen"

        ],


        counter: {
          enable: true
        },


        preview: {

          markdown: {

            toc: true

          }

        },


        cache: {

          enable:false

        },


        after() {

          this.editor.setValue(
            this.state.value
          );

        },


        input: (value)=>{

          this.props.onChange(value);

        }


      });

    },


    componentWillUnmount(){

      if(this.editor){

        this.editor.destroy();

      }

    },


    render(){

      return h(

        "div",

        {

          ref:(el)=>{

            this.el=el;

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
