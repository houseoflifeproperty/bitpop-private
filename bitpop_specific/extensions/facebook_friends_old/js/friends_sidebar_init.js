function setAntiscrollHeight() {
  $('#scrollable-area').height(
    $('body').height() - $('.antiscroll-wrap').offset().top
  );

  $('.antiscroll-inner').width($('body').width());
}

$(document).ready(function() {
  setTimeout(function() {
    setAntiscrollHeight();
    $('.antiscroll-wrap').antiscroll();

    try {
      $('body select').msDropDown();
    } catch(e) {
      alert(e.message);
    }
  }, 1000);
});
$(window).resize(function() {
  setAntiscrollHeight();
  if ($('.antiscroll-wrap').data('antiscroll')) {
    $('.antiscroll-wrap').data('antiscroll').destroy().refresh();
    }
});

