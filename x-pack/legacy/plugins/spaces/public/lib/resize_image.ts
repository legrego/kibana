/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ResizeOpts {
  width: number;
}

const getResizedCanvas = (img: HTMLImageElement, resizeOptions: ResizeOpts) => {
  const resizedCanvas = document.createElement('canvas');
  const drawContext = resizedCanvas.getContext('2d');

  const oc = document.createElement('canvas');
  const octx = oc.getContext('2d');

  // destination canvas dimensions
  resizedCanvas.width = resizeOptions.width;
  resizedCanvas.height = (resizedCanvas.width * img.height) / img.width;

  let currentDimensions = {
    width: Math.floor(img.width * 0.5),
    height: Math.floor(img.height * 0.5),
  };

  oc.width = currentDimensions.width;
  oc.height = currentDimensions.height;

  octx!.drawImage(img, 0, 0, currentDimensions.width, currentDimensions.height);

  while (currentDimensions.width * 0.5 > resizeOptions.width) {
    currentDimensions = {
      width: Math.floor(currentDimensions.width * 0.5),
      height: Math.floor(currentDimensions.height * 0.5),
    };
    octx!.drawImage(
      oc,
      0,
      0,
      currentDimensions.width * 2,
      currentDimensions.height * 2,
      0,
      0,
      currentDimensions.width,
      currentDimensions.height
    );
  }

  drawContext!.drawImage(
    oc,
    0,
    0,
    currentDimensions.width,
    currentDimensions.height,
    0,
    0,
    resizedCanvas.width,
    resizedCanvas.height
  );

  return resizedCanvas;
};

export const resizeImage = async (image: string, resizeOptions: ResizeOpts) => {
  return new Promise<string>((resolve, reject) => {
    try {
      const img: HTMLImageElement = document.createElement('img') as HTMLImageElement;

      img.onload = function() {
        const resizedCanvas = getResizedCanvas(img, resizeOptions);
        resolve(resizedCanvas.toDataURL());
      };

      img.src = image;
    } catch (err) {
      reject(err);
    }
  });
};
