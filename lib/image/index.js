'use strict';

const Promise = require('bluebird');
const BlinkDiff = require('blink-diff');
const PngImg = require('png-img');
const utils = require('png-img/utils');
const SafeRect = require('./safe-rect');

class Image {
    constructor(buffer) {
        this._img = new PngImg(buffer);
    }

    crop(rect, opts) {
        rect = this._scale(rect, (opts || {}).scaleFactor);
        const imageSize = this.getSize();
        const safeRect = SafeRect.create(rect, imageSize);

        this._img.crop(
            safeRect.left,
            safeRect.top,
            safeRect.width,
            safeRect.height
        );

        return Promise.resolve(this);
    }

    getSize() {
        return this._img.size();
    }

    getRGBA(x, y) {
        return this._img.get(x, y);
    }

    save(file) {
        return Promise.fromCallback((cb) => this._img.save(file, cb));
    }

    clear(area, opts) {
        area = this._scale(area, (opts || {}).scaleFactor);
        this._img.fill(
            area.left,
            area.top,
            area.width,
            area.height,
            '#000000'
        );
    }

    join(newImage) {
        const imageSize = this.getSize();
        this._img
            .setSize(imageSize.width, imageSize.height + newImage.getSize().height)
            .insert(newImage._img, 0, imageSize.height);

        return this;
    }

    _scale(area, scaleFactor) {
        scaleFactor = scaleFactor || 1;
        return {
            left: area.left * scaleFactor,
            top: area.top * scaleFactor,
            width: area.width * scaleFactor,
            height: area.height * scaleFactor
        };
    }

    static fromBase64(base64) {
        return new Image(new Buffer(base64, 'base64'));
    }

    static RGBToString(rgb) {
        return utils.RGBToString(rgb);
    }

    static stringToRGBA(string) {
        return utils.stringToRGBA(string);
    }

    static compare(path1, path2, opts) {
        opts = opts || {};
        const compareOptions = {
            imageAPath: path1,
            imageBPath: path2,

            thresholdType: BlinkDiff.THRESHOLD_PERCENT,
            threshold: 0.01,
            delta: opts.tolerance

            // ignoreCaret: opts.canHaveCaret,
            // pixelRatio: opts.pixelRatio
        };

        const diff = new BlinkDiff(compareOptions);

        return new Promise((resolve, reject) => {
            diff.run((error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(diff.hasPassed(result.code));
                }
            });
        });
    }

    static buildDiff(opts) {
        let outputColor;
        if (opts.diffColor) {
            outputColor = Image.stringToRGBA(opts.diffColor);
        }

        const diffOptions = {
            imageAPath: opts.reference,
            imageBPath: opts.current,

            thresholdType: BlinkDiff.THRESHOLD_PERCENT,
            threshold: 0.01,
            delta: opts.tolerance,

            imageOutputPath: opts.diff,
            composition: false,

            outputMaskRed: outputColor.r,
            outputMaskGreen: outputColor.g,
            outputMaskBlue: outputColor.b
        };

        const diff = new BlinkDiff(diffOptions);

        return new Promise((resolve, reject) => {
            diff.run((error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

module.exports = Image;
