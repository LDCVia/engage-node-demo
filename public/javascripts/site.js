$(document).ready(function(){

});

function loadEntry(el, unid){
  $('.list-group-item').removeClass('active');
  $.ajax({
    dataType: "text/html",
    type: 'GET',
    url: '/entry/' + unid,
    complete: function(res) {
      $("#entrydata").html(res.responseText);
      $(el).addClass('active');
    }
  });
}

function newEntry(){
  $('.list-group-item').removeClass('active');
  $.ajax({
    dataType: "text/html",
    type: 'GET',
    url: '/newentry',
    complete: function(res) {
      $("#entrydata").html(res.responseText);
    }
  });
}

function deleteEntry(unid){
  bootbox.confirm("This will delete the person.", function(result){
    if (result){
      $.ajax({
        dataType: "text/html",
        type: 'DELETE',
        url: '/entry/' + unid,
        complete: function(res) {
          window.location.href = "/";
        }
      });
    }
  });
}

function search() {
  $.ajax({
    dataType: "text/html",
    type: 'GET',
    url: '/search?query=' + encodeURI($("#search").val()),
    complete: function(res) {
      $("#entrylist").html(res.responseText);
      $(".pagination").hide();
    }
  });
}

function searchkey(e){
  if (e.keyCode === 13){
    search();
  }
  return false;
}
