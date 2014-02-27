// date formatting extension
Date.prototype.shortLongFormat = function (timeOnly) {
  var months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'];

  var curr_date = this.getDate();
  var curr_month = this.getMonth();
  curr_month++;
  var curr_year = this.getFullYear();

  var curr_hour = this.getHours();

  var a_p;
  if (curr_hour < 12)
     {
     a_p = "AM";
     }
  else
     {
     a_p = "PM";
     }
  if (curr_hour == 0)
     {
     curr_hour = 12;
     }
  if (curr_hour > 12)
     {
     curr_hour = curr_hour - 12;
     }

  var curr_min = this.getMinutes();
  if (curr_min.toString().length == 1)
    curr_min = '0' + curr_min.toString();

  return timeOnly ? curr_hour + ':' + curr_min + ' ' + a_p :
      months[curr_month - 1] + ' ' + curr_date + ', ' + curr_year + ' at ' +
      curr_hour + ':' + curr_min + ' ' + a_p;
};

Date.prototype.isTodayDate = function() {
  var now = new Date();
  return (this.getDate() == now.getDate()) &&
    (this.getMonth() == now.getMonth()) &&
    (this.getFullYear() == now.getFullYear());
};