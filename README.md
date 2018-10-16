# Boop

Boop is an HTML file that makes it easy to see 3D models in VR.

The goal is for people who either don't code or just don't want to code to be able to make art and then see it in their headset.

## Running Boop

Browsers require a secure web connection (https) for WebVR. While you could just copy all of the Boop files up to a server that offers a secure connection, it's pretty easy to run a small local web server and use a tool called ngrok to set up a secure connection.

To run a local server open your terminal app and do the following:

	# Change directory to the place where you put boop
	cd boop 
	# Start the handy built in python web server
	python -m SimpleHTTPServer 8000

Now leave that running and go get ngrok:

Browse over to [ngrok.com](https://ngrok.com/) and click the "Get Started For Free" button. It will take about five minutes to set up an account and download the ngrok program for your computer.

Once you have the ngrok program installed, leave the web server that you started earlier running and open a new terminal.

	# Start ngrok listening to your local server
	ngrok http 8000

Leave that running and point your browser at the URLs that ngrok printed out. The one you want starts with `https://` and ends with `ngrok.io`. It will look like this:

	ngrok by @inconshreveable
	Session Status                online
	Account                       Trevor F Smith (Plan: Basic)
	Version                       2.2.8
	Region                        United States (us)
	Web Interface                 http://127.0.0.1:4040
	Forwarding                    http://93b0feaf.ngrok.io -> localhost:8000
	Forwarding                    https://93b0feaf.ngrok.io -> localhost:8000

That last URL is the one you want. In this case it's `https://93b0feaf.ngrok.io` but yours will be different.

When you load that URL in your browser, you should see the Boop page with a default landscape from [racoon.media](https://racoon.media/).

If you see an "Enter VR" button in the lower right hand side of the page then Boop has found a VR display and will use WebVR to render your model in your headset. If you have a headset and you don't see the button, you might need to set some flags to enable WebVR. Browser over to [webvr.rocks](https://webvr.rocks/) for help with that.

Read the next section for how to load your own models!

## Boop settings

The `boop/settings.txt` file has all of the configuration options, like which model to load, what lights to add, and where you're standing when you enter VR.

There are instructions in the settings file for what the settings mean and how to use them.

