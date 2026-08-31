(function () {
  'use strict';

  if (!window.CMS) {
    console.error('Decap CMS is not loaded.');
    return;
  }

  /*
   * ============================================================
   * Cloudinary configuration
   * ============================================================
   *
   * IMPORTANT:
   * - Cloud Name is safe to expose.
   * - Upload Preset MUST be Unsigned.
   * - NEVER put API Secret here.
   *
   */

  var CLOUDINARY_CLOUD_NAME = 'tr9eesw3';
  var CLOUDINARY_UPLOAD_PRESET = 'blog_images';

  /*
   * ============================================================
   * Fix Vditor fullscreen being covered by Decap CMS header
   * ============================================================
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
   * ============================================================
   * Load Vditor CSS
   * ============================================================
   */

  var css = document.createElement('link');

  css.rel = 'stylesheet';

  css.href =
    'https://unpkg.com/vditor@3.11.0/dist/index.css';

  document.head.appendChild(css);

  /*
   * ============================================================
   * Load Vditor JS
   * ============================================================
   */

  var script = document.createElement('script');

  script.src =
    'https://unpkg.com/vditor@3.11.0/dist/index.min.js';

  script.onload = function () {
    registerWidget();
  };

  script.onerror = function () {
    console.error('Failed to load Vditor.');
  };

  document.head.appendChild(script);

  /*
   * ============================================================
   * Generate unique filename
   * ============================================================
   */

  function generateFilename(file) {
    var name =
      file.name || 'image';

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

    var now =
      new Date();

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

    return (
      timestamp +
      '-' +
      basename +
      extension
    );
  }

  /*
   * ============================================================
   * Compress large images in browser
   *
   * > 5 MB:
   *   resize to max 3000 x 3000
   *   JPEG quality 0.85
   *
   * <= 5 MB:
   *   keep original
   * ============================================================
   */

  function compressImage(file) {
    var MAX_SIZE =
      5 * 1024 * 1024;

    if (file.size <= MAX_SIZE) {
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

        var width =
          image.width;

        var height =
          image.height;

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

        canvas.width =
          width;

        canvas.height =
          height;

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
              ) +
              '.jpg';

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

      image.src =
        objectURL;
    });
  }

  /*
   * ============================================================
   * Upload image to Cloudinary
   * ============================================================
   */

  async function uploadImageToCloudinary(file) {
    /*
     * Basic configuration check
     */

    if (
      !CLOUDINARY_CLOUD_NAME ||
      CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME'
    ) {
      throw new Error(
        'Cloudinary Cloud Name 尚未配置。'
      );
    }

    if (
      !CLOUDINARY_UPLOAD_PRESET ||
      CLOUDINARY_UPLOAD_PRESET === 'YOUR_UPLOAD_PRESET'
    ) {
      throw new Error(
        'Cloudinary Upload Preset 尚未配置。'
      );
    }

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

    /*
     * Generate filename.
     */

    var filename =
      generateFilename(processedFile);

    /*
     * Cloudinary upload endpoint.
     */

    var uploadURL =
      'https://api.cloudinary.com/v1_1/' +
      CLOUDINARY_CLOUD_NAME +
      '/image/upload';

    /*
     * FormData
     */

    var formData =
      new FormData();

    formData.append(
      'file',
      processedFile
    );

    formData.append(
      'upload_preset',
      CLOUDINARY_UPLOAD_PRESET
    );

    /*
     * Store images under:
     *
     * blog/
     */

    formData.append(
      'folder',
      'blog'
    );

    /*
     * Use generated filename.
     */

    formData.append(
      'public_id',
      filename.replace(
        /\.[^.]+$/,
        ''
      )
    );

    /*
     * Upload
     */

    var response =
      await fetch(
        uploadURL,
        {
          method: 'POST',
          body: formData
        }
      );

    var result =
      await response.json();

    /*
     * Error handling
     */

    if (!response.ok) {
      console.error(
        'Cloudinary upload error:',
        result
      );

      throw new Error(
        result.error &&
        result.error.message
          ? result.error.message
          : 'Cloudinary 图片上传失败。'
      );
    }

    /*
     * Cloudinary returns:
     *
     * secure_url
     */

    if (!result.secure_url) {
      console.error(
        'Unexpected Cloudinary response:',
        result
      );

      throw new Error(
        'Cloudinary 没有返回图片 URL。'
      );
    }

    return {
      url:
        result.secure_url,

      filename:
        filename,

      public_id:
        result.public_id
    };
  }

  /*
   * ============================================================
   * Upload multiple files
   * ============================================================
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
      var file =
        files[i];

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
          'Uploading image to Cloudinary:',
          file.name
        );

        var result =
          await uploadImageToCloudinary(
            file
          );

        uploaded.push(
          result
        );

        /*
         * Insert Markdown into Vditor.
         */

        editor.insertValue(
          '\n\n' +
          '![' +
          file.name +
          '](' +
          result.url +
          ')' +
          '\n\n'
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
          (
            error.message ||
            error
          )
        );
      }
    }

    return uploaded;
  }

  /*
   * ============================================================
   * Register Decap widget
   * ============================================================
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
     * ==========================================================
     * Vditor Control
     * ==========================================================
     */

    var VditorControl =
      createClass({
        getInitialState:
          function () {
            return {
              initialized:
                false
            };
          },

        componentDidMount:
          function () {
            var self =
              this;

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

                  /*
                   * =================================================
                   * Cloudinary image upload
                   * =================================================
                   */

                  upload: {
                    accept:
                      'image/*',

                    max:
                      20 * 1024 * 1024,

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
            var self =
              this;

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
     * ============================================================
     * Vditor preview
     * ============================================================
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
     * ============================================================
     * Cloudinary Cover Image Control
     * ============================================================
     */

    var CloudinaryImageControl =
      createClass({
        getInitialState:
          function () {
            return {
              uploading:
                false
            };
          },

        handleSelect:
          async function (event) {
            var self =
              this;

            var files =
              event.target.files;

            if (
              !files ||
              !files.length
            ) {
              return;
            }

            var file =
              files[0];

            /*
             * Only images.
             */

            if (
              !file.type ||
              file.type.indexOf('image/') !== 0
            ) {
              alert(
                '请选择图片文件。'
              );

              event.target.value = '';

              return;
            }

            try {
              self.setState({
                uploading:
                  true
              });

              console.log(
                'Uploading cover image:',
                file.name
              );

              var result =
                await uploadImageToCloudinary(
                  file
                );

              /*
               * Save Cloudinary URL
               * into Decap field.
               */

              self.props.onChange(
                result.url
              );

              console.log(
                'Cover image uploaded:',
                result.url
              );

            } catch (error) {
              console.error(
                'Cover upload failed:',
                error
              );

              alert(
                '封面上传失败：\n\n' +
                (
                  error.message ||
                  error
                )
              );

            } finally {
              self.setState({
                uploading:
                  false
              });

              /*
               * Allow selecting
               * the same file again.
               */

              event.target.value = '';
            }
          },

        handleRemove:
          function () {
            this.props.onChange('');
          },

        render:
          function () {
            var self =
              this;

            var value =
              this.props.value || '';

            return h(
              'div',
              {
                style: {
                  width:
                    '100%'
                }
              },

              /*
               * =================================================
               * Image preview
               * =================================================
               */

              value
                ? h(
                    'div',
                    {
                      style: {
                        marginBottom:
                          '16px'
                      }
                    },

                    h(
                      'img',
                      {
                        src:
                          value,

                        alt:
                          '封面图',

                        style: {
                          display:
                            'block',

                          width:
                            '100%',

                          maxWidth:
                            '600px',

                          maxHeight:
                            '400px',

                          objectFit:
                            'cover',

                          borderRadius:
                            '8px',

                          border:
                            '1px solid #e5e7eb'
                        }
                      }
                    ),

                    h(
                      'div',
                      {
                        style: {
                          marginTop:
                            '8px',

                          fontSize:
                            '12px',

                          color:
                            '#666',

                          wordBreak:
                            'break-all'
                        }
                      },

                      value
                    )
                  )

                : h(
                    'div',
                    {
                      style: {
                        width:
                          '100%',

                        maxWidth:
                          '600px',

                        height:
                          '180px',

                        display:
                          'flex',

                        alignItems:
                          'center',

                        justifyContent:
                          'center',

                        border:
                          '1px dashed #d1d5db',

                        borderRadius:
                          '8px',

                        marginBottom:
                          '12px',

                        color:
                          '#9ca3af',

                        background:
                          '#f9fafb'
                      }
                    },

                    '暂无封面图'
                  ),

              /*
               * =================================================
               * Upload input
               * =================================================
               */

              h(
                'input',
                {
                  type:
                    'file',

                  accept:
                    'image/*',

                  disabled:
                    self.state.uploading,

                  onChange:
                    function (event) {
                      self.handleSelect(
                        event
                      );
                    }
                }
              ),

              /*
               * =================================================
               * Upload status
               * =================================================
               */

              self.state.uploading
                ? h(
                    'div',
                    {
                      style: {
                        marginTop:
                          '10px',

                        color:
                          '#2563eb'
                      }
                    },

                    '正在上传到 Cloudinary，请稍候……'
                  )

                : null,

              /*
               * =================================================
               * Remove button
               * =================================================
               */

              value &&
              !self.state.uploading
                ? h(
                    'button',
                    {
                      type:
                        'button',

                      onClick:
                        function () {
                          self.handleRemove();
                        },

                      style: {
                        marginTop:
                          '12px',

                        padding:
                          '6px 12px',

                        border:
                          '1px solid #d1d5db',

                        borderRadius:
                          '6px',

                        background:
                          '#fff',

                        cursor:
                          'pointer'
                      }
                    },

                    '删除封面'
                  )

                : null
            );
          }
      });

    /*
     * ============================================================
     * Cloudinary Cover Image Preview
     * ============================================================
     */

    var CloudinaryImagePreview =
      createClass({
        render:
          function () {
            var value =
              this.props.value || '';

            if (!value) {
              return h(
                'div',
                null,
                '暂无封面'
              );
            }

            return h(
              'div',
              {
                style: {
                  padding:
                    '20px'
                }
              },

              h(
                'img',
                {
                  src:
                    value,

                  alt:
                    '封面图',

                  style: {
                    display:
                      'block',

                    width:
                      '100%',

                    maxWidth:
                      '800px',

                    maxHeight:
                      '500px',

                    objectFit:
                      'cover',

                    borderRadius:
                      '8px'
                  }
                }
              )
            );
          }
      });

    /*
     * ============================================================
     * Register Vditor widget
     * ============================================================
     */

    CMS.registerWidget(
      'vditor',
      VditorControl,
      VditorPreview
    );

    /*
     * ============================================================
     * Register Cloudinary cover image widget
     * ============================================================
     */

    CMS.registerWidget(
      'cloudinary-image',
      CloudinaryImageControl,
      CloudinaryImagePreview
    );

    console.log(
      'Vditor + Cloudinary image widgets registered.'
    );
  }

})();