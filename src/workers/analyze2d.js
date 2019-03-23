const DateUnitToFormatMap = {
  minute: "YYYY-MM-DD kk:mm",
  hour: "YYYY-MM-DD kk",
  day: "jYYYY/jMM/jDD",
  month: "YYYY-MM",
  year: "YYYY",
  jMonth: "jYYYY/jMM",
  jYear: "jYYYY"
};

self.module = {
  exports: function(params, done) {
    ["moment","moment-jalaali","underscore"].forEach(lib =>
      importScripts(location.origin + "/workers/lib/" + lib + ".js")
    );
    
    console.log(location.origin);
    params = JSON.parse(params);
    // tslint:disable-next-line:no-shadowed-variable

    const input = params._input;
    const formatOptions = params._formatOptions;

    const r = input.report;
    let dataGroups = {};
    // if (formatOptions.groupBy.name.indexOf("date") !== -1) {
    //   r.data = _.groupBy(r.data, p =>
    //     moment(p[formatOptions.groupBy.name]).format("YYYY-MM-DD")
    //   ) as any;
    // } else {

    // }

    if (!formatOptions.groupBy) {
      dataGroups = { all: r.data };
    } else {
      dataGroups = _.groupBy(r.data, p =>
        p[formatOptions.groupBy.name] === "undefined"
          ? "n/a"
          : p[formatOptions.groupBy.name] || "n/a"
      );
    }

    r.data = [];

    for (const groupKey in dataGroups) {
      // group["n/a"] =
      //   [...(group[""] || []), ...(group["undefined"] || [])] || [];
      // delete group[""];
      // delete group["undefined"];
      const dataGroup = dataGroups[groupKey];

      const series = [];

      formatOptions.dateRangeFormat =
        DateUnitToFormatMap[formatOptions.dateRangeUnit];

      const timeRanges = _.range(formatOptions.dateRangeCount).map(n => {
        return moment(
          formatOptions.dateRangeEnd ||
            moment().format(formatOptions.dateRangeFormat),
          formatOptions.dateRangeFormat
        )
          .add(
            n - formatOptions.dateRangeCount + 1,
            formatOptions.dateRangeUnit
          )
          .format(formatOptions.dateRangeFormat);
      });

      let count = 0;
      // tslint:disable-next-line:forin
      for (const timeRange of timeRanges) {
        for (const row of dataGroup) {
          if (
            moment(
              row[formatOptions.dateBy ? formatOptions.dateBy.name : "_vdate"]
            ).format(formatOptions.dateRangeFormat) === timeRange
          ) {
            count++;
          }
        }

        series.push({
          name: timeRange,
          value: count
        });
      }

      r.data.push({
        name: groupKey,
        series
      });
    }

    r.fields = [
      {
        label: formatOptions.groupBy ? formatOptions.groupBy.label : "all",
        name: "name",
        enabled: true
      },
      { label: "تعداد", name: "series", enabled: true }
    ];
    r.count = r.data.length;

    //        r.data = r.data.sort((a, b) => b.value - a.value);
    done(r);
  }
};
