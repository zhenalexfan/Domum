package com.notyet.domum

import android.content.Context
import android.content.Intent
import android.support.v7.app.AppCompatActivity
import android.os.Bundle
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import kotlinx.android.synthetic.main.activity_main.*
import android.support.design.widget.Snackbar
import android.transition.TransitionManager
import android.util.Log
import android.view.View
import com.android.volley.DefaultRetryPolicy
import com.notyet.domum.R.id.text_title


class MainActivity : AppCompatActivity() {

    var room = 1
    val HOST = "http://192.168.43.75:3000"

    var elecUsageMode = MODE_TOKEN
    var elecUsageTokens = 0


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        room = intent.getIntExtra(KEY_ROOM, 1)
        if (room == 1) {
            text_title.text = resources.getStringArray(R.array.rooms)[0]
            roomImage.setImageResource(R.drawable.img_room_1)
        }
        else {
            text_title.text = resources.getStringArray(R.array.rooms)[1]
            roomImage.setImageResource(R.drawable.img_room_2)
        }
        elec_usage_card.setOnClickListener {
            if (elecUsageMode == MODE_TOKEN) {
                elec_usage.text = String.format(String.format(getString(R.string.token_used_watts), elecUsageTokens / 0.32))
                elecUsageMode = MODE_WATT
            }
            else {
                elec_usage.text = String.format(String.format(getString(R.string.token_used), elecUsageTokens))
                elecUsageMode = MODE_TOKEN
            }
        }
        action_pay.setOnClickListener { v -> pay() }
        getUsage()
        check()
    }

    fun getUsage() {
        val queue = Volley.newRequestQueue(this)
        val url = "${HOST}/getusage?roomId=${room}"
        // Request a string response from the provided URL.
        val stringRequest = StringRequest(Request.Method.GET, url,
                Response.Listener<String> { response ->
                    elecUsageTokens = Integer.parseInt(response)
                    elec_usage.text = String.format(getString(R.string.token_used, elecUsageTokens))
                    TransitionManager.beginDelayedTransition(view_group)
                    elec_usage_card.visibility = View.VISIBLE
                },
                Response.ErrorListener {
                    Log.e(TAG, "url = ${url}; getUsage failed: ${it.message}")
                })
        queue.add(stringRequest)
    }

    fun pay() {
        pay_progress.visibility = View.VISIBLE
        action_pay.isEnabled = false
        val queue = Volley.newRequestQueue(this)
        val url = "${HOST}/send?roomId=${room}&value=1"
        // Request a string response from the provided URL.
        val stringRequest = StringRequest(Request.Method.POST, url,
                Response.Listener<String> { response ->
                    pay_progress.visibility = View.INVISIBLE
                    action_pay.isEnabled = true
                    val snackbar = Snackbar.make(constraint, "Paid 1 Token. ", Snackbar.LENGTH_SHORT)
                    check()
                    snackbar.show()
                },
                Response.ErrorListener {
                    pay_progress.visibility = View.INVISIBLE
                    action_pay.isEnabled = true
                    val snackbar = Snackbar.make(constraint, "Payment Error. ", Snackbar.LENGTH_SHORT)
                    snackbar.show()
                    Log.e(TAG, "url = ${url}; payment failed: ${it.message}")
                })
        stringRequest.retryPolicy =DefaultRetryPolicy(
                35000,
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT)
        queue.add(stringRequest)
    }

    fun check() {
        text_progress.visibility = View.VISIBLE
        val queue = Volley.newRequestQueue(this)
        val url = "${HOST}/remaining?roomId=${room}"
        val stringRequest = StringRequest(Request.Method.GET, url,
                Response.Listener<String> { response ->
                    tokens_left.text = String.format(getString(R.string.token_left), response)
                    TransitionManager.beginDelayedTransition(view_group)
                    tokens_left.visibility = View.VISIBLE
                    text_progress.visibility = View.INVISIBLE
                },
                Response.ErrorListener {
                    TransitionManager.beginDelayedTransition(view_group)
                    tokens_left.visibility = View.INVISIBLE
                    text_progress.visibility = View.INVISIBLE
                    Log.e(TAG, "url = ${url}; checking failed: ${it.message}")
                })
        queue.add(stringRequest)
    }

    companion object {
        val TAG = "MainActivity"
        val KEY_ROOM = "KEY_ROOM"
        val MODE_WATT = "MODE_WATT"
        val MODE_TOKEN = "MODE_TOKEN"

        fun actionStart(context: Context, room: Int) {
            val intent = Intent(context, MainActivity::class.java)
            intent.putExtra(KEY_ROOM, room)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        }
    }
}
