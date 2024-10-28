import { useEffect, useState } from "react";
import * as http from "../../common/http";
import gt from "semver/functions/gt";
import pkg from "../../../package.json";

export interface LatestRelease {
  tag_name: string; // tag
  html_url: string; // release 地址
  body: string; // 发布信息
}

export function useLatestRelease() {
  const [latestVersion, setLatestVersion] = useState<LatestRelease>(null);

  useEffect(() => {
    http.share
      .get("https://api.github.com/repos/chenhb23/lanzouyun-disk/releases/latest")
      .json<LatestRelease>()
      .then(value => {
        if (value && gt(value.tag_name, pkg.version)) {
          setLatestVersion(value);
        }
      });
  }, []);

  return latestVersion;
}
