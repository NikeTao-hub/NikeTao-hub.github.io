(function () {
  'use strict';

  if (!window.CMS) {
    console.error('Decap CMS is not loaded.');
    return;
  }

  /*
   * Load Vditor CSS
   */
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/vditor@3.11.0/dist/index.css';
  document.head.appendChild(css);

  /*
   * Load Vditor JS
   */
  var script = document.createElement('script');
  script.src = 'https://unpkg.com/vditor@3.11.0/dist/index.min.js';

  script.onload = function () {
    registerWidget();
  };

  script.onerror = function () {
    console.error('Failed to load Vditor.');
  };

  document.head.appendChild(script);


  function registerWidget() {

    var createClass = window.createClass;
    var h = window.h;

    if (!createClass || !h) {
      console.error('Decap CMS React helpers are unavailable.');
      return;
    }

    var VditorControl = createClass({

      getInitialState: function () {
        return {
          initialized: false
        };
      },

      componentDidMount: function () {
        var self = this;

        if (!window.Vditor) {
          console.error('Vditor is unavailable.');
          return;
        }

        var initialValue = this.props.value || '';

        this.editor = new window.Vditor(
          this.container,

          {
            value: initialValue,

            mode: 'ir',

            height: 600,

            cache: {
              enable: false
            },

            toolbar: [
              'headings',
              'bold',
              'italic',
              'strike',
              '|',
              'line',
              'quote',
              'list',
              'ordered-list',
              'check',
              '|',
              'code',
              'inline-code',
              'link',
              'table',
              '|',
              'upload',
              'emoji',
              '|',
              'undo',
              'redo',
              '|',
              'fullscreen',
              'edit-mode',
              'preview'
            ],

            preview: {
              mode: 'both',
              hljs: {
                enable: true
              },
              math: {
                engine: 'KaTeX',
                inlineDigit: true
              }
            },

            counter: {
              enable: false
            },

            resize: {
              enable: true
            },

            after: function () {

              self.setState({
                initialized: true
              });

              /*
               * Make sure the editor contains the current Decap value.
               */
              if (self.editor && initialValue) {
                self.editor.setValue(initialValue);
              }
            },

            input: function (value) {

              /*
               * Send Markdown back to Decap.
               */
              self.props.onChange(value);

            }
          }
        );
      },


      componentDidUpdate: function (prevProps) {

        if (!this.editor) {
          return;
        }

        var oldValue = prevProps.value || '';
        var newValue = this.props.value || '';

        /*
         * Update the editor only when Decap changed the value
         * from outside the editor.
         */
        if (oldValue !== newValue) {

          var currentValue = this.editor.getValue();

          if (currentValue !== newValue) {
            this.editor.setValue(newValue);
          }
        }
      },


      componentWillUnmount: function () {

        if (this.editor) {
          this.editor.destroy();
          this.editor = null;
        }
      },


      render: function () {

        var self = this;

        return h(
          'div',
          {
            className: this.props.classNameWrapper,
            style: {
              width: '100%'
            }
          },

          h(
            'div',
            {
              ref: function (element) {
                self.container = element;
              },
              id: this.props.forID,
              style: {
                width: '100%'
              }
            }
          )
        );
      }

    });


    /*
     * Preview inside Decap CMS.
     */
    var VditorPreview = createClass({

      render: function () {

        var value = this.props.value || '';

        return h(
          'div',
          {
            style: {
              padding: '20px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }
          },
          value
        );

      }

    });


    CMS.registerWidget(
      'vditor',
      VditorControl,
      VditorPreview
    );

    console.log('Vditor widget registered.');

  }

})();
