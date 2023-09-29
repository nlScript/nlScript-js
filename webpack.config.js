const path = require('path');

module.exports = {
	entry: './src/index.ts',
	// entry: './src/Parser.ts',
	devtool: 'inline-source-map',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
		library: {
			name: 'nls',
			// export: '',
			type: 'umd',
		},
		globalObject: 'this',
	},
};
