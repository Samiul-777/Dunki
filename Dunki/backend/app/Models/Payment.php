<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'agency_id',
        'payer_id',
        'recipient_worker_id',
        'agency_name',
        'purpose',
        'amount',
        'currency',
        'payment_method',
        'card_type',
        'transaction_id',
        'val_id',
        'bank_tran_id',
        'receipt_path',
        'status',
        'payment_date',
        'notes',
    ];

    protected $casts = [
        'amount' => 'float',
        'payment_date' => 'date',
    ];

    protected $appends = ['receipt_url'];

    public function getReceiptUrlAttribute(): ?string
    {
        if (!$this->receipt_path) {
            return null;
        }

        return url('storage/' . $this->receipt_path);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agency()
    {
        return $this->belongsTo(User::class, 'agency_id');
    }

    public function payer()
    {
        return $this->belongsTo(User::class, 'payer_id');
    }

    public function recipientWorker()
    {
        return $this->belongsTo(User::class, 'recipient_worker_id');
    }
}
