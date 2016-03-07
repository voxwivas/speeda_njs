/**
 * Created by Bishaka on 10/02/2016.
 */

$(document).ready(function(){

    var chartData={
        "type":"bar",  // Specify your chart type here.
        "series":[  // Insert your series data here.
            { "values": [35, 42, 67, 89]},
            { "values": [28, 40, 39, 36]}
        ]
    };
    console.log("width : " + $(".dashboard-tile").outerWidth());
    zingchart.render({
        id:'pie-chart',
        data:chartData,
        events:{
            complete:function(p){
                $("#pie-chart-graph-id0-path").attr("fill","rgba(0,0,0,0)");
            }
        },
        height:300,
        autoResize:true,
        backgroundColor:"transparent",
        fill:"rgba(0,0,0,0)"
    });

});