let accessIdInput = document.getElementById('accessId');
let accesskeyInput = document.getElementById('accesskey');
let bucketHostInput = document.getElementById('bucketHost');
let ossDomainInput = document.getElementById('ossDomain');

let accessId = (accessIdInput.value = localStorage.accessId || '');
let accesskey = (accesskeyInput.value = localStorage.accesskey || '');
let bucketHost = (bucketHostInput.value = localStorage.bucketHost || '');
let ossDomain = (ossDomainInput.value = localStorage.ossDomain || '');

accessIdInput.addEventListener('input', () => {
  localStorage.accessId = accessId = accessIdInput.value;
});

accesskeyInput.addEventListener('input', () => {
  localStorage.accesskey = accesskey = accesskeyInput.value;
});

bucketHostInput.addEventListener('input', () => {
  localStorage.bucketHost = accesskey = bucketHostInput.value;
});

ossDomainInput.addEventListener('input', () => {
  localStorage.ossDomain = ossDomain = ossDomainInput.value;
});

let customName = '';
let g_dirname = '';
let g_object_name = '';
let g_object_name_type = '';
let now = (timestamp = Date.parse(new Date()) / 1000);

var policyText = {
  // "expiration": "2020-01-01T12:00:00.000Z", //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了
  expiration: new Date(Date.now() + 600000), //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了
  conditions: [
    ['content-length-range', 0, 1048576000], // 设置上传文件的大小限制
  ],
};

var policyBase64 = Base64.encode(JSON.stringify(policyText));
message = policyBase64;
var bytes = Crypto.HMAC(Crypto.SHA1, message, accesskey, { asBytes: true });
var signature = Crypto.util.bytesToBase64(bytes);

function check_object_radio() {
  var tt = document.getElementsByName('myradio');
  for (var i = 0; i < tt.length; i++) {
    if (tt[i].checked) {
      g_object_name_type = tt[i].value;
      break;
    }
  }
}

function dateDir() {
  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;

  if (month < 10) {
    month = '0' + month;
  }

  return year + '/' + month + '/';
}

function get_dirname() {
  let dir = document.getElementById('dirname').value;
  if (dir != '' && dir.indexOf('/') != dir.length - 1) {
    dir = dir + '/';
  }
  g_dirname = dir + dateDir();
}

function random_string(len) {
  len = len || 32;
  var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  var maxPos = chars.length;
  var pwd = '';
  for (i = 0; i < len; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

function get_suffix(filename) {
  pos = filename.lastIndexOf('.');
  suffix = '';
  if (pos != -1) {
    suffix = filename.substring(pos);
  }
  return suffix;
}

function calculate_object_name(filename) {
  if (g_object_name_type == 'local_name') {
    g_object_name += '${filename}';
  } else if (g_object_name_type == 'random_name') {
    suffix = get_suffix(filename);
    g_object_name = g_dirname + random_string(10) + suffix;
  } else if (g_object_name_type == 'custom_name') {
    suffix = get_suffix(filename);
    customName = document.getElementById('customFilename').value;
    g_object_name = g_dirname + customName + suffix;
  }
  return '';
}

function get_uploaded_object_name(filename) {
  if (g_object_name_type == 'local_name') {
    tmp_name = g_object_name;
    tmp_name = tmp_name.replace('${filename}', filename);
    return tmp_name;
  } else if (g_object_name_type == 'random_name') {
    return g_object_name;
  } else if (g_object_name_type == 'custom_name') {
    return g_object_name;
  }
}

function set_upload_param(up, filename, ret) {
  g_object_name = g_dirname;
  if (filename != '') {
    suffix = get_suffix(filename);
    calculate_object_name(filename);
  }
  new_multipart_params = {
    key: g_object_name,
    policy: policyBase64,
    OSSAccessKeyId: accessId,
    success_action_status: '200', //让服务端返回200,不然，默认会返回204
    signature: signature,
  };

  up.setOption({
    url: bucketHost,
    multipart_params: new_multipart_params,
  });

  up.start();
}

var uploader = new plupload.Uploader({
  runtimes: 'html5',
  browse_button: 'selectfiles',
  multi_selection: false,
  container: document.getElementById('container'),
  url: 'http://oss.aliyuncs.com',

  init: {
    PostInit: function () {
      document.getElementById('ossfile').innerHTML = '';
      document.getElementById('postfiles').onclick = function () {
        set_upload_param(uploader, '', false);
        return false;
      };
    },

    FilesAdded: function (up, files) {
      plupload.each(files, function (file) {
        document.getElementById('ossfile').innerHTML +=
          '<div id="' +
          file.id +
          '">' +
          file.name +
          ' (' +
          plupload.formatSize(file.size) +
          ')<pre></pre>' +
          '<div class="progress"><div class="progress-bar" style="width: 0%"></div></div>' +
          '</div>';
      });
    },

    BeforeUpload: function (up, file) {
      check_object_radio();
      if (
        g_object_name_type == 'custom_name' &&
        document.getElementById('customFilename').value == ''
      ) {
        alert('未输入文件名称，请刷新页面后在上传');
        return false;
      }
      get_dirname();
      set_upload_param(up, file.name, true);
    },

    UploadProgress: function (up, file) {
      var d = document.getElementById(file.id);
      d.getElementsByTagName('pre')[0].innerHTML =
        '<span>' + file.percent + '%</span>';
      var prog = d.getElementsByTagName('div')[0];
      var progBar = prog.getElementsByTagName('div')[0];
      progBar.style.width = file.percent + '%';
      progBar.setAttribute('aria-valuenow', file.percent);
    },

    FileUploaded: function (up, file, info) {
      let host = ossDomain || bucketHost;
      if (info.status == 200) {
        document
          .getElementById(file.id)
          .getElementsByTagName('pre')[0].innerHTML =
          '<code>' +
          host +
          '/' +
          get_uploaded_object_name(file.name) +
          '</code>';
      } else {
        document
          .getElementById(file.id)
          .getElementsByTagName('pre')[0].innerHTML = info.response;
      }
    },

    Error: function (up, err) {
      document
        .getElementById('console')
        .appendChild(document.createTextNode('\nError xml:' + err));
    },
  },
});

uploader.init();
