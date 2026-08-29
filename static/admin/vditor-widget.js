(function () {
  'use strict';

  if (!window.CMS) {
    console.error('Decap CMS is not loaded.');
    return;
  }

  /*
   * Fix Vditor fullscreen being covered by Decap CMS header
   */
  var fullscreenStyle = document.createElement('style');

  fullscreenStyle.textContent = `
    .vditor--fullscreen {
      z-index: 99999 !important;
    }

    .vditor--fullscreen .vditor-toolbar {
      z-index: 100000 !important;
    }
  `;

  document.head.appendChild(fullscreenStyle);

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


  /*
   * GitHub configuration
   */
  var GITHUB_OWNER = 'NikeTao-hub';
  var GITHUB_REPO = 'NikeTao-hub.github.io';
  var GITHUB_BRANCH = 'main';

  var IMAGE_DIR = 'static/images/uploads';


  /*
   * Get current Decap GitHub token
   */
  function getGitHubToken() {

    var raw =
      localStorage.getItem('decap-cms-user');

    if (!raw) {
      throw new Error(
        '没有找到 Decap 登录信息，请重新登录后台。'
      );
    }

    var user;

    try {
      user = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        'Decap 登录信息解析失败，请重新登录后台。'
      );
    }

    if (
      !user ||
      user.backendName !== 'github' ||
      !user.token
    ) {
      throw new Error(
        '没有找到 GitHub 登录凭证，请重新登录后台。'
      );
    }

    return user.token;
  }


  /*
   * Generate unique filename
   */
  function generateFilename(file) {

    var name = file.name || 'image';

    var dot =
      name.lastIndexOf('.');

    var extension =
      dot >= 0
        ? name.substring(dot).toLowerCase()
        : '';

    var basename =
      dot >= 0
        ? name.substring(0, dot)
        : name;

    basename =
      basename
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    if (!basename) {
      basename = 'image';
    }

    var now = new Date();

    var timestamp =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0') +
      '-' +
      String(now.getMilliseconds()).padStart(3, '0');

    return timestamp + '-' + basename + extension;
  }


  /*
   * Convert File to Base64
   */
  function fileToBase64(file) {

    return new Promise(function (resolve, reject) {

      var reader =
        new FileReader();

      reader.onload = function () {

        var result =
          reader.result;

        if (
          typeof result !== 'string'
        ) {
          reject(
            new Error('图片读取失败。')
          );
          return;
        }

        var comma =
          result.indexOf(',');

        if (comma === -1) {
          reject(
            new Error('图片格式解析失败。')
          );
          return;
        }

        resolve(
          result.substring(comma + 1)
        );
      };

      reader.onerror = function () {
        reject(
          new Error('图片读取失败。')
        );
      };

      reader.readAsDataURL(file);
    });
  }


  /*
   * Compress large images in browser
   *
   * > 5 MB:
   * JPEG compression
   *
   * <= 5 MB:
   * original file
   */
  function compressImage(file) {

    var MAX_SIZE =
      5 * 1024 * 1024;

    if (
      file.size <= MAX_SIZE
    ) {
      return Promise.resolve(file);
    }

    /*
     * Only compress raster images.
     */
    if (
      !file.type ||
      file.type.indexOf('image/') !== 0 ||
      file.type === 'image/gif' ||
      file.type === 'image/svg+xml'
    ) {
      return Promise.resolve(file);
    }

    return new Promise(function (resolve) {

      var image =
        new Image();

      var objectURL =
        URL.createObjectURL(file);

      image.onload = function () {

        URL.revokeObjectURL(objectURL);

        var maxWidth = 3000;
        var maxHeight = 3000;

        var width = image.width;
        var height = image.height;

        /*
         * Resize very large images.
         */
        if (
          width > maxWidth ||
          height > maxHeight
        ) {

          var scale =
            Math.min(
              maxWidth / width,
              maxHeight / height
            );

          width =
            Math.round(width * scale);

          height =
            Math.round(height * scale);
        }

        var canvas =
          document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        var context =
          canvas.getContext('2d');

        if (!context) {
          resolve(file);
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          function (blob) {

            if (!blob) {
              resolve(file);
              return;
            }

            /*
             * Only use compressed version
             * if it is actually smaller.
             */
            if (
              blob.size >= file.size
            ) {
              resolve(file);
              return;
            }

            var newName =
              file.name.replace(
                /\.[^.]+$/,
                ''
              ) + '.jpg';

            var compressed =
              new File(
                [blob],
                newName,
                {
                  type: 'image/jpeg',
                  lastModified:
                    Date.now()
                }
              );

            resolve(compressed);

          },
          'image/jpeg',
          0.85
        );
      };

      image.onerror = function () {

        URL.revokeObjectURL(objectURL);

        resolve(file);
      };

      image.src = objectURL;

    });
  }


  /*
   * Upload image to GitHub Contents API
   */
  async function uploadImageToGitHub(file) {

    var token =
      getGitHubToken();

    /*
     * 20 MB hard limit.
     */
    var HARD_LIMIT =
      20 * 1024 * 1024;

    if (file.size > HARD_LIMIT) {
      throw new Error(
        '图片超过 20 MB，请先压缩后再上传。'
      );
    }

    /*
     * Compress large images.
     */
    var processedFile =
      await compressImage(file);

    if (
      processedFile !== file
    ) {

      console.log(
        'Image compressed:',
        file.size,
        '->',
        processedFile.size
      );
    }

    var filename =
      generateFilename(processedFile);

    var path =
      IMAGE_DIR + '/' + filename;

    var content =
      await fileToBase64(processedFile);

    var response =
      await fetch(
        'https://api.github.com/repos/' +
        GITHUB_OWNER +
        '/' +
        GITHUB_REPO +
        '/contents/' +
        path,
        {
          method: 'PUT',

          headers: {
            'Authorization':
              'Bearer ' + token,

            'Accept':
              'application/vnd.github+json',

            'Content-Type':
              'application/json',

            'X-GitHub-Api-Version':
              '2022-11-28'
          },

          body: JSON.stringify({
            message:
              'Upload image: ' + filename,

            content:
              content,

            branch:
              GITHUB_BRANCH
          })
        }
      );

    var result =
      await response.json();

    if (!response.ok) {

      console.error(
        'GitHub API error:',
        result
      );

      throw new Error(
        result.message ||
        'GitHub 图片上传失败。'
      );
    }

    return {
      url:
        '/images/uploads/' + filename,

      filename:
        filename,

      path:
        path
    };
  }


  /*
   * Upload multiple files
   */
  async function uploadImages(files, editor) {

    if (!files || !files.length) {
      return;
    }

    var uploaded = [];

    for (
      var i = 0;
      i < files.length;
      i++
    ) {

      var file = files[i];

      /*
       * Only images.
       */
      if (
        !file.type ||
        file.type.indexOf('image/') !== 0
      ) {
        continue;
      }

      try {

        console.log(
          'Uploading image:',
          file.name
        );

        var result =
          await uploadImageToGitHub(file);

        uploaded.push(result);

        /*
         * Insert Markdown into Vditor.
         */
        editor.insertValue(
          '\n\n' +
          '![' +
          file.name +
          '](' +
          result.url +
          ')\n\n'
        );

        console.log(
          'Image uploaded:',
          result.url
        );

      } catch (error) {

        console.error(
          'Image upload failed:',
          error
        );

        alert(
          '图片上传失败：\n\n' +
          (error.message || error)
        );
      }
    }

    return uploaded;
  }


  /*
   * Register Decap widget
   */
  function registerWidget() {

    var createClass =
      window.createClass;

    var h =
      window.h;

    if (
      !createClass ||
      !h
    ) {

      console.error(
        'Decap CMS React helpers are unavailable.'
      );

      return;
    }


    /*
     * Vditor Control
     */
    var VditorControl =
      createClass({

        getInitialState:
          function () {

            return {
              initialized: false
            };

          },


        componentDidMount:
          function () {

            var self = this;

            if (!window.Vditor) {

              console.error(
                'Vditor is unavailable.'
              );

              return;
            }

            var initialValue =
              this.props.value || '';


            self.editor =
              new window.Vditor(
                self.container,

                {

                  value:
                    initialValue,

                  mode:
                    'ir',

                  height:
                    600,

                  cache: {
                    enable:
                      false
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

                    mode:
                      'both',

                    hljs: {
                      enable:
                        true
                    },

                    math: {
                      engine:
                        'KaTeX',

                      inlineDigit:
                        true
                    }

                  },


                  counter: {
                    enable:
                      false
                  },


                  resize: {
                    enable:
                      true
                  },


                  upload: {

                    accept:
                      'image/*',

                    max: 20 * 1024 * 1024,

                    handler:
                      function (files) {

                        uploadImages(
                          files,
                          self.editor
                        );

                        return null;
                      }
                  },


                  after:
                    function () {

                      self.setState({
                        initialized:
                          true
                      });

                      /*
                       * Make sure Vditor
                       * contains current Decap value.
                       */
                      if (
                        self.editor &&
                        initialValue
                      ) {

                        self.editor.setValue(
                          initialValue
                        );

                      }

                    },


                  input:
                    function (value) {

                      /*
                       * Send Markdown
                       * back to Decap.
                       */
                      self.props.onChange(
                        value
                      );

                    }

                }
              );

          },


        componentDidUpdate:
          function (prevProps) {

            if (!this.editor) {
              return;
            }

            var oldValue =
              prevProps.value || '';

            var newValue =
              this.props.value || '';

            if (
              oldValue !== newValue
            ) {

              var currentValue =
                this.editor.getValue();

              if (
                currentValue !== newValue
              ) {

                this.editor.setValue(
                  newValue
                );

              }

            }

          },


        componentWillUnmount:
          function () {

            if (this.editor) {

              this.editor.destroy();

              this.editor = null;

            }

          },


        render:
          function () {

            var self = this;

            return h(

              'div',

              {

                className:
                  this.props.classNameWrapper,

                style: {
                  width:
                    '100%'
                }

              },

              h(

                'div',

                {

                  ref:
                    function (element) {

                      self.container =
                        element;

                    },

                  id:
                    this.props.forID,

                  style: {
                    width:
                      '100%'
                  }

                }

              )

            );

          }

      });


    /*
     * Decap preview
     */
    var VditorPreview =
      createClass({

        render:
          function () {

            var value =
              this.props.value || '';

            return h(

              'div',

              {

                style: {
                  padding:
                    '20px',

                  whiteSpace:
                    'pre-wrap',

                  fontFamily:
                    'monospace'
                }

              },

              value

            );

          }

      });


    /*
     * Register widget
     */
    CMS.registerWidget(

      'vditor',

      VditorControl,

      VditorPreview

    );


    console.log(
      'Vditor widget registered with GitHub image upload.'
    );

  }

})();